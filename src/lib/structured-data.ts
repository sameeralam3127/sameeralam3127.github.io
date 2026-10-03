/** schema.org JSON-LD builders. Only facts from profile.ts; nothing inferred. */
import { profile, repoUrl, type Project } from "@/data/profile";

const site = profile.site.url;
const personId = `${site}/#person`;

export const personSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": personId,
  name: profile.name,
  jobTitle: profile.title,
  description: profile.headline,
  url: `${site}/`,
  image: `${site}/og/index.png`,
  email: `mailto:${profile.contact.email}`,
  address: {
    "@type": "PostalAddress",
    addressLocality: profile.location.split(",")[0]?.trim(),
    addressCountry: "IN",
  },
  knowsAbout: profile.focus,
  alumniOf: profile.education.map((e) => ({
    "@type": "CollegeOrUniversity",
    name: e.institution.split(",")[0]?.trim(),
  })),
  sameAs: profile.contact.social.map((s) => s.href),
});

export const websiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: profile.name,
  url: `${site}/`,
  author: { "@id": personId },
});

export const projectSchema = (project: Project, description: string) => {
  const url = `${site}/projects/${project.slug}/`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      name: project.name,
      description,
      url,
      image: `${site}/og/${project.slug}.png`,
      keywords: project.stack.join(", "),
      author: { "@type": "Person", "@id": personId, name: profile.name, url: `${site}/` },
      ...(project.repoPublic ? { codeRepository: repoUrl(project.repo) } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${site}/` },
        { "@type": "ListItem", position: 2, name: "Projects", item: `${site}/#projects` },
        { "@type": "ListItem", position: 3, name: project.name, item: url },
      ],
    },
  ];
};
