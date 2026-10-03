import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { profile } from "@/data/profile";
import { renderOgImage, type OgCard } from "@/lib/og";

/** One Open Graph image per page: /og/index.png and /og/<project-slug>.png. */
export const getStaticPaths = (async () => {
  const deepDives = await getCollection("projects");
  const cards: { slug: string; card: OgCard }[] = [
    {
      slug: "index",
      card: {
        eyebrow: "~",
        title: profile.name,
        subtitle: profile.title,
        tags: profile.focus,
      },
    },
    ...deepDives.flatMap((entry) => {
      const project = profile.projects.find((p) => p.slug === entry.id);
      return project
        ? [
            {
              slug: project.slug,
              card: {
                eyebrow: `~/projects/${project.slug}`,
                title: project.name,
                subtitle: project.tagline,
                tags: project.stack,
              },
            },
          ]
        : [];
    }),
  ];
  return cards.map(({ slug, card }) => ({ params: { slug }, props: { card } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgImage((props as { card: OgCard }).card);
  return new Response(png, { headers: { "Content-Type": "image/png" } });
};
