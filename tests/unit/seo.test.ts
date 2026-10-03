import { describe, expect, it } from "vitest";
import { analytics } from "@/data/site-config";
import { profile } from "@/data/profile";
import { personSchema, projectSchema, websiteSchema } from "@/lib/structured-data";

describe("structured data", () => {
  it("describes the person with the public title and real profiles", () => {
    const person = personSchema();
    expect(person["@type"]).toBe("Person");
    expect(person.jobTitle).toBe(profile.title);
    expect(person.sameAs).toEqual(profile.contact.social.map((s) => s.href));
    expect(person.url).toBe(`${profile.site.url}/`);
  });

  it("links the website to the person", () => {
    expect(websiteSchema().author).toEqual({ "@id": personSchema()["@id"] });
  });

  it("only exposes a code repository for public projects", () => {
    for (const project of profile.projects) {
      const [code, breadcrumbs] = projectSchema(project, project.description);
      expect(code?.["@type"]).toBe("SoftwareSourceCode");
      expect("codeRepository" in (code ?? {})).toBe(project.repoPublic);
      expect(breadcrumbs?.itemListElement?.at(-1)?.item).toBe(
        `${profile.site.url}/projects/${project.slug}/`,
      );
    }
  });
});

describe("analytics", () => {
  it("is off by default", () => {
    expect(analytics.provider).toBe("none");
  });
});
