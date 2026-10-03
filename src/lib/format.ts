/** Formatting helpers shared by build-time templates and client scripts. */

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 days ago", "last week", "just now". */
export const timeAgo = (iso: string, now: Date = new Date()): string => {
  const seconds = (new Date(iso).getTime() - now.getTime()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
};

/** "3 Oct 2026, 14:22 UTC" — stable across visitors' locales. */
export const formatUtc = (iso: string): string => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${date}, ${time} UTC`;
};

/** 3 Oct 2026 */
export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/** 1234 → "1,234"; 12900 → "12.9K". */
export const compactNumber = (n: number): string =>
  new Intl.NumberFormat("en", { notation: n >= 10_000 ? "compact" : "standard" }).format(n);

/** 83_400 ms → "1m 23s"; 4_200 → "4.2s". */
export const formatDuration = (ms: number): string => {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
};

export const shortSha = (sha: string): string => sha.slice(0, 7);
