/** Small helpers shared by the build-time data scripts. */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const GENERATED_DIR = join(ROOT, "src", "data", "generated");

export const log = (scope: string, message: string): void => {
  console.log(`[${scope}] ${message}`);
};

export const writeJson = async (path: string, data: unknown): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
};

/** `fetch` with a timeout, so a slow API can never hang the build. */
export const fetchWithTimeout = async (
  url: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<Response> => fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });

/**
 * Data scripts must never fail the build: the site has fallbacks for every
 * generated file. Log the problem and exit cleanly instead.
 */
export const runSafely = async (scope: string, task: () => Promise<void>): Promise<void> => {
  try {
    await task();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    log(scope, `skipped: ${reason}. The site will use its fallback content.`);
  }
};
