/**
 * Build-time "latest from Compute Central" → src/data/generated/articles.json
 *
 * The blog has no RSS feed, so this reads its sitemap, picks the most recently
 * modified article pages (not section indexes) and fetches each page's <title>
 * and meta description. The curated list in profile.ts is the fallback.
 */
import { join } from "node:path";
import { profile } from "../src/data/profile.ts";
import type { ArticleSnapshot } from "../src/lib/generated-types.ts";
import { fetchWithTimeout, GENERATED_DIR, log, runSafely, writeJson } from "./lib.ts";

const SCOPE = "articles";
const LIMIT = 6;
const base = new URL(profile.writing.href);
const EXCLUDED_SECTIONS = new Set(["about", "privacy"]);

const decodeEntities = (text: string): string =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .trim();

const metaContent = (html: string, name: string): string | null => {
  const tag = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, "i"))?.[0];
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content) : null;
};

await runSafely(SCOPE, async () => {
  const res = await fetchWithTimeout(new URL("/sitemap.xml", base).href);
  if (!res.ok) throw new Error(`sitemap → ${res.status}`);
  const xml = await res.text();

  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map(([, block = ""]) => ({
      loc: block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim() ?? "",
      lastmod: block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? "",
    }))
    .filter(({ loc, lastmod }) => {
      if (!loc || !lastmod) return false;
      const segments = new URL(loc).pathname.split("/").filter(Boolean);
      // Article pages are at least two levels deep: /<section>/.../<article>/
      return segments.length >= 2 && !EXCLUDED_SECTIONS.has(segments[0] ?? "");
    })
    .sort((a, b) => b.lastmod.localeCompare(a.lastmod) || a.loc.localeCompare(b.loc));

  const articles: ArticleSnapshot["articles"] = [];
  const seenSections = new Set<string>();

  // Prefer one article per section so the list shows the breadth of the site.
  for (const pass of [true, false]) {
    for (const entry of entries) {
      if (articles.length >= LIMIT) break;
      if (articles.some((a) => a.href === entry.loc)) continue;
      const topic = new URL(entry.loc).pathname.split("/").filter(Boolean)[0] ?? "guides";
      if (pass && seenSections.has(topic)) continue;

      const page = await fetchWithTimeout(entry.loc).catch(() => null);
      if (!page?.ok) continue;
      const html = await page.text();
      const rawTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1];
      const description = metaContent(html, "description") ?? metaContent(html, "og:description");
      if (!rawTitle || !description) continue;

      seenSections.add(topic);
      articles.push({
        title: decodeEntities(rawTitle).replace(/\s+[-|–]\s+Compute Central$/i, ""),
        description,
        href: entry.loc,
        topic,
        lastmod: entry.lastmod,
      });
    }
  }

  if (articles.length === 0) throw new Error("no articles found in sitemap");

  const snapshot: ArticleSnapshot = { generatedAt: new Date().toISOString(), articles };
  await writeJson(join(GENERATED_DIR, "articles.json"), snapshot);
  log(SCOPE, `wrote ${articles.length} articles`);
});
