/**
 * Minimal static server for dist/, used by Playwright. Mirrors GitHub Pages:
 * `/path/` → `path/index.html`, `/path` → `path.html` or `path/index.html`,
 * anything else → `404.html` with status 404.
 *
 *   node scripts/serve.ts [port]
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { ROOT } from "./lib.ts";

const DIST = resolve(ROOT, "dist");
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 4321);

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const isFile = async (path: string) => (await stat(path).catch(() => null))?.isFile() ?? false;

const resolveRequest = async (pathname: string): Promise<string | null> => {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const base = join(DIST, safe);
  if (!base.startsWith(DIST)) return null;
  const candidates = pathname.endsWith("/")
    ? [join(base, "index.html")]
    : [base, `${base}.html`, join(base, "index.html")];
  for (const candidate of candidates) if (await isFile(candidate)) return candidate;
  return null;
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  const file = await resolveRequest(pathname);
  const status = file ? 200 : 404;
  const path = file ?? join(DIST, "404.html");
  res.writeHead(status, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" });
  createReadStream(path).pipe(res);
}).listen(PORT, () => console.log(`serving dist/ on http://localhost:${PORT}`));
