/**
 * Build-time Open Graph images (1200×630 PNG) rendered with satori → resvg.
 * Colours mirror the dark theme tokens in global.css.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

export interface OgCard {
  /** Mono line above the title, e.g. "~/projects/kuberescue". */
  eyebrow: string;
  title: string;
  subtitle: string;
  tags: string[];
}

const C = {
  bg: "#111217",
  panel: "#181b1f",
  line: "#2a2e35",
  text: "#e6e9ef",
  muted: "#a0a8b6",
  accent: "#6e9fff",
  ok: "#73bf69",
};

type Node = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style: { display: "flex", ...style }, children },
});

const require = createRequire(import.meta.url);
const font = (pkg: string, file: string) => readFile(require.resolve(`${pkg}/files/${file}`));

let fonts: Promise<Parameters<typeof satori>[1]["fonts"]> | null = null;
const loadFonts = () =>
  (fonts ??= Promise.all([
    font("@fontsource/ibm-plex-sans", "ibm-plex-sans-latin-400-normal.woff"),
    font("@fontsource/ibm-plex-sans", "ibm-plex-sans-latin-600-normal.woff"),
    font("@fontsource/jetbrains-mono", "jetbrains-mono-latin-400-normal.woff"),
  ]).then(([sans, sansBold, mono]) => [
    { name: "Plex", data: sans, weight: 400 as const, style: "normal" as const },
    { name: "Plex", data: sansBold, weight: 600 as const, style: "normal" as const },
    { name: "Mono", data: mono, weight: 400 as const, style: "normal" as const },
  ]));

/** The Latin font subsets have no arrows (U+2190–21FF); use the ASCII form. */
const latinSafe = (text: string) => text.replace(/→/g, "->").replace(/←/g, "<-");

export async function renderOgImage(card: OgCard): Promise<Uint8Array<ArrayBuffer>> {
  const tree = h(
    "div",
    {
      width: "100%",
      height: "100%",
      padding: 56,
      backgroundColor: C.bg,
      backgroundImage: `linear-gradient(${C.line}55 1px, transparent 1px), linear-gradient(90deg, ${C.line}55 1px, transparent 1px)`,
      backgroundSize: "48px 48px",
      fontFamily: "Plex",
    },
    h(
      "div",
      {
        flex: 1,
        flexDirection: "column",
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        backgroundColor: C.panel,
        padding: "44px 52px",
      },
      [
        h("div", { alignItems: "center", gap: 14, fontFamily: "Mono", fontSize: 26 }, [
          h("div", { width: 14, height: 14, borderRadius: 999, backgroundColor: C.ok }),
          h("span", { color: C.ok }, "sameeralam"),
          h("span", { color: C.muted, marginLeft: -14 }, `@infra:${card.eyebrow}$`),
        ]),
        h(
          "div",
          {
            marginTop: 40,
            fontSize: card.title.length > 28 ? 64 : 76,
            fontWeight: 600,
            color: C.text,
            lineHeight: 1.1,
          },
          latinSafe(card.title),
        ),
        h(
          "div",
          { marginTop: 18, fontFamily: "Mono", fontSize: 30, color: C.accent },
          latinSafe(card.subtitle),
        ),
        h(
          "div",
          { marginTop: "auto", flexWrap: "wrap", gap: 12 },
          card.tags.slice(0, 6).map((tag) =>
            h(
              "div",
              {
                fontFamily: "Mono",
                fontSize: 22,
                color: C.muted,
                border: `1px solid ${C.line}`,
                borderRadius: 6,
                padding: "6px 14px",
              },
              latinSafe(tag),
            ),
          ),
        ),
      ],
    ),
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: await loadFonts(),
  });
  // Copy into an ArrayBuffer-backed array so it is a valid Response body.
  return new Uint8Array(new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng());
}
