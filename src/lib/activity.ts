import type { ActivityWeek } from "./generated-types.ts";

/** Monday-based week start for a date, as YYYY-MM-DD (UTC). */
export const weekStart = (date: Date): string => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
};

/** Buckets timestamps into consecutive weeks, including empty weeks. */
export const bucketByWeek = (
  timestamps: string[],
  weeks: number,
  now = new Date(),
): ActivityWeek[] => {
  const counts = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i * 7);
    counts.set(weekStart(d), 0);
  }
  for (const ts of timestamps) {
    const key = weekStart(new Date(ts));
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([start, count]) => ({ start, count }));
};
