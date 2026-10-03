import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const node = z.object({
  id: z.string(),
  label: z.string(),
  caption: z.string().optional(),
  detail: z.string(),
  kind: z.enum(["trigger", "process", "check", "store", "output", "external"]),
});

/**
 * Project deep dives: src/content/projects/<slug>.md, where <slug> matches a
 * project slug in src/data/profile.ts. Frontmatter holds the structured story;
 * the Markdown body holds the "in practice" walkthrough with code.
 */
const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/projects" }),
  schema: z.object({
    problem: z.string(),
    approach: z.array(z.string()).min(1),
    outcome: z.array(z.string()).min(1),
    diagram: z.object({
      title: z.string(),
      stages: z.array(z.object({ label: z.string(), nodes: z.array(node).min(1) })).min(1),
    }),
  }),
});

export const collections = { projects };
