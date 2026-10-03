/**
 * Build metadata, in two steps around `astro build`:
 *
 *   node scripts/build-meta.ts start
 *     → src/data/generated/build.json (commit, branch, run link, start time),
 *       baked into the HTML at build time.
 *
 *   node scripts/build-meta.ts finish
 *     → dist/build-meta.json (adds finish time and duration). The status
 *       panel reads this file at runtime.
 *
 *   node scripts/build-meta.ts lighthouse <dir>
 *     → merges Lighthouse scores from an LHCI output directory into
 *       dist/build-meta.json. Run by CI after Lighthouse has audited dist/.
 */
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BuildInfo, BuildMeta, LighthouseScores } from "../src/lib/generated-types.ts";
import { GENERATED_DIR, log, ROOT, writeJson } from "./lib.ts";

const SCOPE = "build-meta";
const BUILD_INFO = join(GENERATED_DIR, "build.json");
const BUILD_META = join(ROOT, "dist", "build-meta.json");

const git = (...args: string[]): string | null => {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
};

const start = async (): Promise<void> => {
  const env = process.env;
  const repository = env.GITHUB_REPOSITORY ?? null;
  const info: BuildInfo = {
    sha: env.GITHUB_SHA ?? git("rev-parse", "HEAD"),
    branch: env.GITHUB_REF_NAME ?? git("rev-parse", "--abbrev-ref", "HEAD"),
    repository,
    runUrl:
      repository && env.GITHUB_RUN_ID
        ? `${env.GITHUB_SERVER_URL ?? "https://github.com"}/${repository}/actions/runs/${env.GITHUB_RUN_ID}`
        : null,
    startedAt: new Date().toISOString(),
  };
  await writeJson(BUILD_INFO, info);
  log(SCOPE, `build started at ${info.startedAt} (${info.sha?.slice(0, 7) ?? "no sha"})`);
};

/** Reads median scores from an LHCI `.lighthouseci` directory, preferring home page runs. */
const readLighthouse = async (dir: string): Promise<LighthouseScores | null> => {
  const files = (await readdir(dir)).filter((f) => f.startsWith("lhr-") && f.endsWith(".json"));
  if (files.length === 0) return null;

  const runs = await Promise.all(
    files.map(async (f) => {
      const lhr = JSON.parse(await readFile(join(dir, f), "utf8")) as {
        requestedUrl?: string;
        categories: Record<string, { score: number | null }>;
      };
      const score = (key: string) => Math.round((lhr.categories[key]?.score ?? 0) * 100);
      return {
        home: lhr.requestedUrl ? new URL(lhr.requestedUrl).pathname === "/" : false,
        performance: score("performance"),
        accessibility: score("accessibility"),
        bestPractices: score("best-practices"),
        seo: score("seo"),
      };
    }),
  );

  const homeRuns = runs.filter((r) => r.home);
  if (homeRuns.length > 0) runs.splice(0, runs.length, ...homeRuns);

  // Report the median run per category, like LHCI's assertions do.
  const median = (values: number[]) =>
    values.sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
  return {
    performance: median(runs.map((r) => r.performance)),
    accessibility: median(runs.map((r) => r.accessibility)),
    bestPractices: median(runs.map((r) => r.bestPractices)),
    seo: median(runs.map((r) => r.seo)),
  };
};

const finish = async (): Promise<void> => {
  const info = JSON.parse(await readFile(BUILD_INFO, "utf8")) as BuildInfo;
  const finishedAt = new Date();
  const meta: BuildMeta = {
    ...info,
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - new Date(info.startedAt).getTime(),
    lighthouse: null,
  };
  await writeJson(BUILD_META, meta);
  log(SCOPE, `build took ${(meta.durationMs / 1000).toFixed(1)}s`);
};

const addLighthouse = async (dir: string): Promise<void> => {
  const meta = JSON.parse(await readFile(BUILD_META, "utf8")) as BuildMeta;
  const lighthouse = await readLighthouse(join(ROOT, dir)).catch(() => null);
  if (!lighthouse) {
    log(SCOPE, `no Lighthouse results found in ${dir}; leaving scores empty`);
    return;
  }
  await writeJson(BUILD_META, { ...meta, lighthouse } satisfies BuildMeta);
  log(SCOPE, `lighthouse: ${JSON.stringify(lighthouse)}`);
};

const [command, arg] = process.argv.slice(2);
if (command === "start") {
  await start();
} else if (command === "finish") {
  await finish();
} else if (command === "lighthouse" && arg) {
  await addLighthouse(arg);
} else {
  console.error("usage: build-meta.ts start | finish | lighthouse <dir>");
  process.exit(1);
}
