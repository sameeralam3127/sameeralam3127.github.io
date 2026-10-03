/** Command palette items and matching, kept pure so they can be unit-tested. */

/** Dispatched on `document` to open the palette (e.g. from the header button). */
export const PALETTE_OPEN_EVENT = "palette:open";

export type PaletteAction = "toggle-theme" | "system-theme" | "copy-email";

export interface PaletteItem {
  id: string;
  label: string;
  group: "Sections" | "Projects" | "Actions" | "Links";
  /** Secondary text, e.g. a URL or tagline. */
  hint?: string;
  href?: string;
  action?: PaletteAction;
  /** Extra words that should match, e.g. "dark light" for the theme toggle. */
  keywords?: string;
}

/**
 * Scores an item against a query: every query word must appear in the label,
 * hint or keywords. Label prefix matches rank highest. Returns -1 for no match.
 */
export function scoreItem(item: PaletteItem, query: string): number {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const label = item.label.toLowerCase();
  const haystack = `${label} ${item.hint ?? ""} ${item.keywords ?? ""} ${item.group}`.toLowerCase();

  let score = 0;
  for (const word of words) {
    if (!haystack.includes(word)) return -1;
    if (label.startsWith(word)) score += 3;
    else if (label.includes(word)) score += 2;
    else score += 1;
  }
  return score;
}

export function filterItems(items: PaletteItem[], query: string): PaletteItem[] {
  if (!query.trim()) return items;
  return items
    .map((item, index) => ({ item, index, score: scoreItem(item, query) }))
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.item);
}
