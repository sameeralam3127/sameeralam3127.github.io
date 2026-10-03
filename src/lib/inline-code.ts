/** Splits "run `foo` now" into text and code parts for rendering frontmatter prose. */
export interface InlinePart {
  text: string;
  code: boolean;
}

export const inlineCode = (text: string): InlinePart[] =>
  text
    .split(/(`[^`]+`)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("`") && part.endsWith("`")
        ? { text: part.slice(1, -1), code: true }
        : { text: part, code: false },
    );
