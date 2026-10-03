import { getCollection } from "astro:content";

/** Slugs of projects that have a page at /projects/<slug>/. */
export const getDeepDiveSlugs = async (): Promise<string[]> =>
  (await getCollection("projects")).map((entry) => entry.id);
