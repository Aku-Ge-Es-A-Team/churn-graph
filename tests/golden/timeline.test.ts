// F-19 timeline against the real graph (read-only): C01's signals in order, with days before renewal.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { addDays, buildTimeline, type TimelineItem } from "../../src/lib/timeline";
import { fetchRanking, fetchSignals, referenceDate } from "../../src/server/queries/risk";
import { HAS_GRAPH, openRunner } from "../helpers/runner";

describe.skipIf(!HAS_GRAPH)("signal timeline on real signals (read-only)", () => {
  let close: () => Promise<void>;
  let c01: TimelineItem[] = [];
  let c06: TimelineItem[] = [];

  beforeAll(async () => {
    const runner = openRunner();
    close = runner.close;
    const rows = await fetchRanking(runner.run);
    const renewal = (id: string) => {
      const days = rows.find((r) => r.account === id)?.renewalDays ?? null;
      return days === null ? null : addDays(referenceDate(), days);
    };
    c01 = buildTimeline(await fetchSignals(runner.run, "C01"), renewal("C01"));
    c06 = buildTimeline(await fetchSignals(runner.run, "C06"), renewal("C06"));
  }, 60_000);
  afterAll(() => close());

  test("C01 lists its signals oldest first, each before the renewal date", () => {
    // Printed so the team can compare with PRD F-19 (17-06 → 20-07 → 15-08 → 18-09); `since` is owned by F-04.
    console.log("C01 timeline:", c01.map((i) => `${i.since} ${i.code} (${i.daysBeforeRenewal}d)`).join(" | "));
    expect(c01.length).toBeGreaterThan(0);
    const dates = c01.map((i) => i.since);
    expect([...dates].sort()).toEqual(dates);
    for (const i of c01) expect(i.daysBeforeRenewal).toBeGreaterThan(0);
  });

  test("C06 has no signals, so its timeline is empty", () => {
    expect(c06).toEqual([]);
  });
});
