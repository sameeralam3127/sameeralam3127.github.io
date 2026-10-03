import type { APIRoute } from "astro";

/**
 * Many crawlers and tools look for /sitemap.xml by convention. @astrojs/sitemap
 * writes sitemap-index.xml; this serves the same index at the conventional path.
 */
export const GET: APIRoute = ({ site }) => {
  const index = new URL("/sitemap-0.xml", site).href;
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${index}</loc></sitemap></sitemapindex>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};
