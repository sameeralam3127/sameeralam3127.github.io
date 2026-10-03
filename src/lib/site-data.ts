/**
 * Reads the build-time JSON written by `npm run data`. Each file is optional:
 * `import.meta.glob` simply finds nothing when a script was skipped (offline,
 * rate-limited), and every accessor returns a safe fallback.
 */
import { profile, type Article } from "@/data/profile";
import type { ArticleSnapshot, BuildInfo, GitHubSnapshot, RepoStats } from "./generated-types";

const files = import.meta.glob<{ default: unknown }>("../data/generated/*.json", { eager: true });

const load = <T>(name: string): T | null =>
  (files[`../data/generated/${name}.json`]?.default as T | undefined) ?? null;

export const github = load<GitHubSnapshot>("github");
export const buildInfo = load<BuildInfo>("build");
const articleSnapshot = load<ArticleSnapshot>("articles");

/** Latest Compute Central articles, or the curated list from profile.ts. */
export const articles: { items: (Article & { lastmod?: string })[]; live: boolean } =
  articleSnapshot && articleSnapshot.articles.length > 0
    ? { items: articleSnapshot.articles, live: true }
    : { items: profile.writing.articles, live: false };

const reposByName = new Map(github?.repos.map((r) => [r.fullName.toLowerCase(), r]) ?? []);

/** Stats for an `owner/name` repo, if it was in the snapshot. */
export const repoStats = (fullName: string): RepoStats | undefined =>
  reposByName.get(fullName.toLowerCase());
