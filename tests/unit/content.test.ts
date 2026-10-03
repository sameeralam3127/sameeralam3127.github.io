import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sitePipeline } from "@/data/architecture";
import { navigation } from "@/data/navigation";
import { profile } from "@/data/profile";

/** Content invariants: catch editing mistakes in src/data before they ship. */
describe("profile.ts", () => {
  it("never uses the banned titles", () => {
    const serialized = JSON.stringify(profile).toLowerCase();
    expect(serialized).not.toContain("devops engineer");
    expect(serialized).not.toContain("technical lead");
  });

  it("keeps years of experience consistent with the career start", () => {
    const years = new Date().getFullYear() - profile.careerStartYear;
    expect(Math.abs(years - profile.yearsExperience)).toBeLessThanOrEqual(1);
  });

  it("has unique project slugs and owner/name repos", () => {
    const slugs = profile.projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of profile.projects) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(p.repo).toMatch(/^[\w.-]+\/[\w.-]+$/);
    }
  });

  it("uses absolute https URLs for external links", () => {
    const links = [
      ...profile.projects.flatMap((p) => p.links ?? []).map((l) => l.href),
      ...profile.contact.social.map((s) => s.href),
      ...profile.openSource.map((o) => o.href),
      ...profile.writing.articles.map((a) => a.href),
    ];
    for (const href of links) expect(href).toMatch(/^https:\/\//);
  });

  it("points the resume at a file that exists", () => {
    expect(existsSync(`public${profile.resume.docx}`)).toBe(true);
    if (profile.resume.pdf) expect(existsSync(`public${profile.resume.pdf}`)).toBe(true);
  });
});

describe("deep dives", () => {
  it("only exist for projects defined in profile.ts", () => {
    const files = readdirSync("src/content/projects").filter((f) => f.endsWith(".md"));
    const slugs = new Set(profile.projects.map((p) => p.slug));
    for (const file of files) expect(slugs, file).toContain(file.replace(/\.md$/, ""));
  });
});

describe("navigation and diagrams", () => {
  it("links only to in-page anchors with unique labels", () => {
    expect(new Set(navigation.map((n) => n.label)).size).toBe(navigation.length);
    for (const item of navigation) expect(item.href).toMatch(/^\/#[a-z]+$/);
  });

  it("gives every diagram node a unique id and some detail", () => {
    const nodes = sitePipeline.stages.flatMap((s) => s.nodes);
    expect(new Set(nodes.map((n) => n.id)).size).toBe(nodes.length);
    for (const node of nodes) expect(node.detail.length).toBeGreaterThan(20);
  });
});
