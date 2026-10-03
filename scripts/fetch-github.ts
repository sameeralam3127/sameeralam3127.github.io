/**
 * Build-time GitHub snapshot → src/data/generated/github.json
 *
 * With GITHUB_TOKEN (CI) it uses GraphQL: contribution calendar, real last
 * commits on the default branch. Without a token it falls back to the public
 * REST API and the public events feed (last ~90 days), so local builds work too.
 */
import { join } from "node:path";
import { profile } from "../src/data/profile.ts";
import { bucketByWeek } from "../src/lib/activity.ts";
import type { GitHubSnapshot, RepoStats } from "../src/lib/generated-types.ts";
import { fetchWithTimeout, GENERATED_DIR, log, runSafely, writeJson } from "./lib.ts";

const SCOPE = "github";
const API = "https://api.github.com";
const LOGIN = profile.handle;
const SITE_REPO = profile.site.repo.replace("https://github.com/", "");
const DEPLOY_WORKFLOW = "deploy.yml";
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

const headers: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": `${LOGIN}-portfolio-build`,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

const getJson = async <T>(path: string): Promise<T> => {
  const res = await fetchWithTimeout(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return (await res.json()) as T;
};

// ---------------------------------------------------------------------------
// GraphQL (authenticated)
// ---------------------------------------------------------------------------

interface GraphQLRepo {
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  homepageUrl: string | null;
  stargazerCount: number;
  forkCount: number;
  isArchived: boolean;
  pushedAt: string | null;
  primaryLanguage: { name: string } | null;
  issues: { totalCount: number };
  pullRequests: { totalCount: number };
  repositoryTopics: { nodes: { topic: { name: string } }[] };
  defaultBranchRef: {
    target: { committedDate?: string; messageHeadline?: string } | null;
  } | null;
}

interface GraphQLResponse {
  data?: {
    user: {
      followers: { totalCount: number };
      repositories: { nodes: GraphQLRepo[] };
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: { firstDay: string; contributionDays: { contributionCount: number }[] }[];
        };
      };
    };
  };
  errors?: { message: string }[];
}

const QUERY = `
query ($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    followers { totalCount }
    repositories(ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, first: 100,
                 orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        name nameWithOwner description url homepageUrl stargazerCount forkCount isArchived pushedAt
        primaryLanguage { name }
        issues(states: OPEN) { totalCount }
        pullRequests(states: OPEN) { totalCount }
        repositoryTopics(first: 10) { nodes { topic { name } } }
        defaultBranchRef { target { ... on Commit { committedDate messageHeadline } } }
      }
    }
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks { firstDay contributionDays { contributionCount } }
      }
    }
  }
}`;

const fetchGraphQL = async (): Promise<Omit<GitHubSnapshot, "deploys" | "generatedAt">> => {
  const to = new Date();
  const from = new Date(to);
  from.setFullYear(to.getFullYear() - 1);

  const res = await fetchWithTimeout(`${API}/graphql`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: QUERY,
      variables: { login: LOGIN, from: from.toISOString(), to: to.toISOString() },
    }),
  });
  if (!res.ok) throw new Error(`GraphQL → ${res.status}`);
  const body = (await res.json()) as GraphQLResponse;
  if (body.errors?.length || !body.data) {
    throw new Error(`GraphQL: ${body.errors?.map((e) => e.message).join("; ") ?? "no data"}`);
  }

  const { user } = body.data;
  const repos: RepoStats[] = user.repositories.nodes.map((r) => ({
    name: r.name,
    fullName: r.nameWithOwner,
    description: r.description,
    url: r.url,
    homepage: r.homepageUrl || null,
    language: r.primaryLanguage?.name ?? null,
    stars: r.stargazerCount,
    forks: r.forkCount,
    openIssues: r.issues.totalCount + r.pullRequests.totalCount,
    lastCommitAt: r.defaultBranchRef?.target?.committedDate ?? r.pushedAt,
    lastCommitMessage: r.defaultBranchRef?.target?.messageHeadline ?? null,
    topics: r.repositoryTopics.nodes.map((t) => t.topic.name),
    archived: r.isArchived,
  }));

  const calendar = user.contributionsCollection.contributionCalendar;
  return {
    source: "graphql",
    user: { login: LOGIN, publicRepos: repos.length, followers: user.followers.totalCount },
    repos,
    activity: {
      kind: "contributions",
      total: calendar.totalContributions,
      weeks: calendar.weeks.map((w) => ({
        start: w.firstDay,
        count: w.contributionDays.reduce((sum, d) => sum + d.contributionCount, 0),
      })),
    },
  };
};

// ---------------------------------------------------------------------------
// REST (anonymous fallback)
// ---------------------------------------------------------------------------

interface RestRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string | null;
  topics?: string[];
  archived: boolean;
  fork: boolean;
}

interface RestEvent {
  created_at: string;
}

const fetchRest = async (): Promise<Omit<GitHubSnapshot, "deploys" | "generatedAt">> => {
  const [user, rawRepos] = await Promise.all([
    getJson<{ followers: number }>(`/users/${LOGIN}`),
    getJson<RestRepo[]>(`/users/${LOGIN}/repos?per_page=100&type=owner&sort=pushed`),
  ]);

  // The public events feed covers ~90 days, at most 300 events over 3 pages.
  const events: RestEvent[] = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await getJson<RestEvent[]>(
      `/users/${LOGIN}/events/public?per_page=100&page=${page}`,
    );
    events.push(...batch);
    if (batch.length < 100) break;
  }

  const repos: RepoStats[] = rawRepos
    .filter((r) => !r.fork)
    .map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      url: r.html_url,
      homepage: r.homepage || null,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      openIssues: r.open_issues_count,
      lastCommitAt: r.pushed_at,
      lastCommitMessage: null,
      topics: r.topics ?? [],
      archived: r.archived,
    }));

  return {
    source: "rest",
    user: { login: LOGIN, publicRepos: repos.length, followers: user.followers },
    repos,
    activity: {
      kind: "public events",
      total: events.length,
      weeks: bucketByWeek(
        events.map((e) => e.created_at),
        13,
      ),
    },
  };
};

const fetchDeploys = async (): Promise<GitHubSnapshot["deploys"]> => {
  try {
    const runs = await getJson<{ workflow_runs: { conclusion: string | null }[] }>(
      `/repos/${SITE_REPO}/actions/workflows/${DEPLOY_WORKFLOW}/runs?status=completed&per_page=50`,
    );
    const completed = runs.workflow_runs.filter((r) => r.conclusion !== "cancelled");
    if (completed.length === 0) return null;
    return {
      workflow: DEPLOY_WORKFLOW,
      total: completed.length,
      succeeded: completed.filter((r) => r.conclusion === "success").length,
    };
  } catch {
    return null; // Workflow not created yet, or API unavailable.
  }
};

await runSafely(SCOPE, async () => {
  let base: Omit<GitHubSnapshot, "deploys" | "generatedAt">;
  if (token) {
    try {
      base = await fetchGraphQL();
    } catch (error) {
      log(SCOPE, `GraphQL failed (${(error as Error).message}); falling back to REST`);
      base = await fetchRest();
    }
  } else {
    log(SCOPE, "no GITHUB_TOKEN; using the public REST API");
    base = await fetchRest();
  }

  const snapshot: GitHubSnapshot = {
    generatedAt: new Date().toISOString(),
    ...base,
    deploys: await fetchDeploys(),
  };

  await writeJson(join(GENERATED_DIR, "github.json"), snapshot);
  log(
    SCOPE,
    `wrote ${snapshot.repos.length} repos, ${snapshot.activity.total} ${snapshot.activity.kind} (${snapshot.source})`,
  );
});
