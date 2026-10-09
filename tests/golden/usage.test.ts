// F-18 golden (T17-06) against the real graph, read-only: C03 and C05 compare their 4.12 outlets with the 19 offline
// control outlets; accounts without an anomaly (C02, C06) get no chart.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fetchUsageComparison, type UsageComparison } from "../../src/server/queries/usage";
import { HAS_GRAPH, openRunner } from "../helpers/runner";

describe.skipIf(!HAS_GRAPH)("usage vs release comparison (read-only)", () => {
  let close: () => Promise<void>;
  const result = new Map<string, UsageComparison | null>();

  beforeAll(async () => {
    const runner = openRunner();
    close = runner.close;
    for (const id of ["C02", "C03", "C05", "C06"]) result.set(id, await fetchUsageComparison(runner.run, id));
  }, 60_000);
  afterAll(() => close());

  test("C03: 6 affected outlets vs 19 control outlets, release 4.12 on 2026-06-29, 12 monthly points", () => {
    const c03 = result.get("C03")!;
    expect(c03).not.toBeNull();
    expect(c03.release.version).toBe("4.12");
    expect(c03.release.date).toBe("2026-06-29");
    expect(c03.affectedCount).toBe(6);
    expect(c03.controlCount).toBe(19);
    expect(c03.points).toHaveLength(12);
  });

  test("C03: affected outlets drop after the release while the control group stays roughly flat", () => {
    const c03 = result.get("C03")!;
    const at = (m: string) => c03.points.find((p) => p.month === m)!;
    const before = at("2026-05");
    const after = at("2026-08");
    expect(after.affected.transactions!).toBeLessThan(before.affected.transactions! * 0.8);
    expect(Math.abs(after.control.transactions! - before.control.transactions!)).toBeLessThan(before.control.transactions! * 0.1);
  });

  test("C05 has a chart with 5 affected outlets", () => {
    expect(result.get("C05")?.affectedCount).toBe(5);
  });

  test("C02 and C06 have no usage anomaly, so no chart", () => {
    expect(result.get("C02")).toBeNull();
    expect(result.get("C06")).toBeNull();
  });
});
