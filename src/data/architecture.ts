import type { Diagram } from "@/lib/diagram";

/** How this site is built and shipped. Keep in sync with .github/workflows/. */
export const sitePipeline: Diagram = {
  id: "site-pipeline",
  title: "sameeralam3127.github.io — delivery pipeline",
  stages: [
    {
      label: "trigger",
      nodes: [
        {
          id: "push",
          label: "git push",
          caption: "main · pull_request",
          kind: "trigger",
          detail:
            "Pull requests run the full CI suite; merges to main deploy. Nothing reaches production without passing the same checks.",
        },
        {
          id: "cron",
          label: "nightly cron",
          caption: "schedule · dispatch",
          kind: "trigger",
          detail:
            "A nightly scheduled run rebuilds the site so GitHub stats and the latest Compute Central articles stay fresh without a commit. It can also be run by hand with workflow_dispatch.",
        },
      ],
    },
    {
      label: "verify",
      nodes: [
        {
          id: "quality",
          label: "lint · format · types",
          caption: "eslint · prettier · astro check",
          kind: "check",
          detail:
            "ESLint, a Prettier check and strictest TypeScript (including exactOptionalPropertyTypes and noUncheckedIndexedAccess) run on every pull request.",
        },
        {
          id: "tests",
          label: "tests",
          caption: "vitest · playwright",
          kind: "check",
          detail:
            "Vitest covers the data and logic: terminal commands, the incident engine, content invariants. Playwright smoke tests load every page, drive the terminal and fail on any console error.",
        },
        {
          id: "security",
          label: "security",
          caption: "gitleaks · npm audit · codeql",
          kind: "check",
          detail:
            "Secret scanning, a dependency audit that fails on high severity, and CodeQL for JavaScript/TypeScript. All actions are pinned to full commit SHAs and kept current by Dependabot.",
        },
      ],
    },
    {
      label: "build",
      nodes: [
        {
          id: "data",
          label: "fetch data",
          caption: "github graphql · sitemap",
          kind: "external",
          detail:
            "Build-time scripts pull repo stats and the contribution calendar with the workflow's GITHUB_TOKEN, and the newest Compute Central articles from its sitemap. Results ship as static JSON, so visitors never hit API rate limits. Any failure falls back to curated content instead of failing the build.",
        },
        {
          id: "astro",
          label: "astro build",
          caption: "static html · react islands",
          kind: "process",
          detail:
            "Astro renders every page to static HTML. Only the interactive pieces (terminal, incident simulator, command palette) hydrate as React islands; everything else ships zero JavaScript.",
        },
      ],
    },
    {
      label: "audit",
      nodes: [
        {
          id: "lighthouse",
          label: "lighthouse ci",
          caption: "budget ≥ 95",
          kind: "check",
          detail:
            "Lighthouse CI audits the built site and enforces a hard budget of 95 for Performance, Accessibility, Best Practices and SEO. The median scores are written into build-meta.json and shown in the status panel.",
        },
        {
          id: "links",
          label: "link check",
          caption: "lychee",
          kind: "check",
          detail:
            "lychee checks every internal and external link in the built HTML so a renamed repo or moved article can't ship as a 404.",
        },
      ],
    },
    {
      label: "deploy",
      nodes: [
        {
          id: "pages",
          label: "github pages",
          caption: "upload-pages-artifact · deploy-pages",
          kind: "output",
          detail:
            "The dist/ folder is uploaded as a Pages artifact and deployed to the github-pages environment with OIDC. Permissions are least-privilege (contents: read, pages: write, id-token: write) and a concurrency group cancels stale deploys.",
        },
      ],
    },
    {
      label: "observe",
      nodes: [
        {
          id: "smoke",
          label: "post-deploy check",
          caption: "curl → 200",
          kind: "check",
          detail:
            "After deploy, the pipeline requests the live URL and fails the run if it doesn't return 200. The deploy success rate in the status panel comes from these runs.",
        },
      ],
    },
  ],
};
