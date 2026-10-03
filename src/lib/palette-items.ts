import { navigation } from "@/data/navigation";
import { profile, repoUrl } from "@/data/profile";
import type { PaletteItem } from "./palette";

/** Everything the command palette can jump to or do. */
export const buildPaletteItems = (deepDives: string[]): PaletteItem[] => [
  ...navigation.map((item): PaletteItem => ({
    id: `section-${item.href}`,
    label: item.label,
    group: "Sections",
    href: item.href,
    hint: item.href.replace("/", ""),
  })),
  ...profile.projects
    .filter((p) => p.featured && (deepDives.includes(p.slug) || p.repoPublic))
    .map((p): PaletteItem => ({
      id: `project-${p.slug}`,
      label: p.name,
      group: "Projects",
      hint: deepDives.includes(p.slug) ? "deep dive" : "github",
      href: deepDives.includes(p.slug) ? `/projects/${p.slug}/` : repoUrl(p.repo),
      keywords: `${p.tagline} ${p.stack.join(" ")}`,
    })),
  {
    id: "action-theme",
    label: "Toggle light / dark theme",
    group: "Actions",
    action: "toggle-theme",
    keywords: "dark light mode colour color",
  },
  {
    id: "action-email",
    label: "Copy email address",
    group: "Actions",
    action: "copy-email",
    hint: profile.contact.email,
    keywords: "contact mail",
  },
  {
    id: "action-resume",
    label: "Download resume (.docx)",
    group: "Actions",
    href: profile.resume.docx,
    keywords: "cv",
  },
  ...profile.contact.social.map((s): PaletteItem => ({
    id: `link-${s.label}`,
    label: s.label,
    group: "Links",
    href: s.href,
    hint: s.handle,
  })),
];
