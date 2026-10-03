import { describe, expect, it } from "vitest";
import { bucketByWeek, weekStart } from "@/lib/activity";
import { compactNumber, formatDate, formatDuration, shortSha, timeAgo } from "@/lib/format";
import { inlineCode } from "@/lib/inline-code";
import { filterItems, scoreItem, type PaletteItem } from "@/lib/palette";

describe("activity bucketing", () => {
  it("uses Monday as the week start (UTC)", () => {
    expect(weekStart(new Date("2026-10-03T12:00:00Z"))).toBe("2026-09-28"); // Saturday
    expect(weekStart(new Date("2026-09-28T00:00:00Z"))).toBe("2026-09-28"); // Monday
    expect(weekStart(new Date("2026-10-04T23:59:59Z"))).toBe("2026-09-28"); // Sunday
  });

  it("returns consecutive weeks including empty ones", () => {
    const now = new Date("2026-10-03T12:00:00Z");
    const weeks = bucketByWeek(
      [
        "2026-10-01T10:00:00Z",
        "2026-10-02T10:00:00Z",
        "2026-09-15T10:00:00Z",
        "2020-01-01T00:00:00Z",
      ],
      4,
      now,
    );
    expect(weeks.map((w) => w.start)).toEqual([
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
    ]);
    expect(weeks.map((w) => w.count)).toEqual([0, 1, 0, 2]);
  });
});

describe("format", () => {
  const now = new Date("2026-10-03T12:00:00Z");

  it("formats relative time", () => {
    expect(timeAgo("2026-10-03T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-10-03T09:00:00Z", now)).toBe("3 hours ago");
    expect(timeAgo("2026-10-02T12:00:00Z", now)).toBe("yesterday");
    expect(timeAgo("2026-09-03T12:00:00Z", now)).toBe("last month");
  });

  it("formats dates, durations, numbers and SHAs", () => {
    expect(formatDate("2026-10-03T23:30:00Z")).toBe("3 Oct 2026");
    expect(formatDuration(4_200)).toBe("4.2s");
    expect(formatDuration(83_400)).toBe("1m 23s");
    expect(compactNumber(3250)).toBe("3,250");
    expect(compactNumber(12_900)).toBe("13K");
    expect(shortSha("b426ceb0123456789")).toBe("b426ceb");
  });
});

describe("inlineCode", () => {
  it("splits backtick spans into code parts", () => {
    expect(inlineCode("run `make test` now")).toEqual([
      { text: "run ", code: false },
      { text: "make test", code: true },
      { text: " now", code: false },
    ]);
    expect(inlineCode("no code")).toEqual([{ text: "no code", code: false }]);
  });
});

describe("command palette matching", () => {
  const items: PaletteItem[] = [
    { id: "1", label: "Projects", group: "Sections", href: "/#projects" },
    {
      id: "2",
      label: "KubeRescue",
      group: "Projects",
      href: "/projects/kuberescue/",
      keywords: "kubernetes go",
    },
    {
      id: "3",
      label: "Toggle light / dark theme",
      group: "Actions",
      action: "toggle-theme",
      keywords: "mode",
    },
  ];

  it("returns everything for an empty query", () => {
    expect(filterItems(items, "  ")).toEqual(items);
  });

  it("requires every word to match", () => {
    expect(scoreItem(items[1] as PaletteItem, "kube go")).toBeGreaterThan(0);
    expect(scoreItem(items[1] as PaletteItem, "kube python")).toBe(-1);
  });

  it("matches keywords and ranks label prefixes first", () => {
    expect(filterItems(items, "dark").map((i) => i.id)).toEqual(["3"]);
    expect(filterItems(items, "mode").map((i) => i.id)).toEqual(["3"]);
    expect(filterItems(items, "pro").map((i) => i.id)[0]).toBe("1");
  });
});
