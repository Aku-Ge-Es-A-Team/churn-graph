import { describe, expect, test } from "bun:test";
import { addDays, buildTimeline, factsSummary, renewalOffsetLabel } from "../../src/lib/timeline";
import type { Signal } from "../../src/types/graph";

const sig = (code: string, since: string, weight = 1, facts: Record<string, unknown> = {}): Signal => ({
  account: "C01",
  code,
  weight,
  evidenceIds: ["C01"],
  facts,
  since,
});

describe("buildTimeline", () => {
  test("sorts oldest first and counts calendar days to renewal (synthetic example of ±148 days, PRD §4)", () => {
    const items = buildTimeline([sig("B", "2026-08-15"), sig("A", "2026-07-20")], "2026-12-15");
    expect(items.map((i) => i.code)).toEqual(["A", "B"]);
    expect(items[0].daysBeforeRenewal).toBe(148);
    expect(items[1].daysBeforeRenewal).toBe(122);
  });

  test("keeps one item per code with the earliest date", () => {
    const items = buildTimeline([sig("A", "2026-09-01"), sig("A", "2026-07-01")], "2026-12-15");
    expect(items).toHaveLength(1);
    expect(items[0].since).toBe("2026-07-01");
  });

  test("ties on the same day: higher weight first, then code", () => {
    const items = buildTimeline([sig("Z", "2026-07-01", 1), sig("Y", "2026-07-01", 3), sig("X", "2026-07-01", 1)], null);
    expect(items.map((i) => i.code)).toEqual(["Y", "X", "Z"]);
  });

  test("a signal after renewal gets a negative offset; no renewal date gives null", () => {
    expect(buildTimeline([sig("A", "2026-12-20")], "2026-12-15")[0].daysBeforeRenewal).toBe(-5);
    expect(buildTimeline([sig("A", "2026-12-20")], null)[0].daysBeforeRenewal).toBeNull();
  });

  test("no signals gives an empty timeline", () => {
    expect(buildTimeline([], "2026-12-15")).toEqual([]);
  });
});

describe("helpers", () => {
  test("renewal offset labels", () => {
    expect(renewalOffsetLabel(148)).toBe("148 days before renewal");
    expect(renewalOffsetLabel(1)).toBe("1 day before renewal");
    expect(renewalOffsetLabel(-3)).toBe("3 days after renewal");
    expect(renewalOffsetLabel(0)).toBe("On the renewal date");
    expect(renewalOffsetLabel(null)).toBeNull();
  });

  test("addDays works on calendar days in UTC", () => {
    expect(addDays(new Date("2026-10-01T00:00:00Z"), 75)).toBe("2026-12-15");
  });

  test("facts summary is short and readable", () => {
    expect(factsSummary({ contact: "K017", moved_to: "P01", empty: "", n: 3, list: ["a", "b"] })).toEqual([
      "contact: K017",
      "moved to: P01",
      "n: 3",
    ]);
  });
});
