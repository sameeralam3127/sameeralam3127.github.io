/**
 * Shapes of the JSON files written to `src/data/generated/` by `scripts/*`.
 * Shared by the scripts (writers) and the site (readers). Every file is
 * optional at build time: the site falls back gracefully when one is missing.
 */

export interface RepoStats {
  name: string;
  /** `owner/name`. */
  fullName: string;
  description: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  /** Open issues + PRs, as GitHub counts them. */
  openIssues: number;
  /** ISO timestamp of the latest commit on the default branch (or last push). */
  lastCommitAt: string | null;
  lastCommitMessage: string | null;
  topics: string[];
  archived: boolean;
}

export interface ActivityWeek {
  /** ISO date (YYYY-MM-DD) of the week's first day. */
  start: string;
  count: number;
}

export interface GitHubSnapshot {
  generatedAt: string;
  /** `graphql` = authenticated contribution calendar; `rest` = public events fallback. */
  source: "graphql" | "rest";
  user: {
    login: string;
    publicRepos: number;
    followers: number;
  };
  repos: RepoStats[];
  activity: {
    /** What `count` measures, for the chart caption. */
    kind: "contributions" | "public events";
    total: number;
    weeks: ActivityWeek[];
  };
  deploys: {
    workflow: string;
    total: number;
    succeeded: number;
  } | null;
}

export interface ArticleSnapshot {
  generatedAt: string;
  articles: {
    title: string;
    description: string;
    href: string;
    topic: string;
    lastmod: string;
  }[];
}

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface BuildInfo {
  sha: string | null;
  branch: string | null;
  repository: string | null;
  /** Link to the Actions run that produced this build, when built in CI. */
  runUrl: string | null;
  startedAt: string;
}

/** Written to `dist/build-meta.json` after the build finishes. */
export interface BuildMeta extends BuildInfo {
  finishedAt: string;
  durationMs: number;
  lighthouse: LighthouseScores | null;
}
