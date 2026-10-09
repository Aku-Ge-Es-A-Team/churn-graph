import { describe, expect, test } from "bun:test";
import { buildUsageComparison } from "../../../src/server/queries/usage";

const row = (grp: "affected" | "control", month: string, transactions: number | null, offlineSynced: number | null) => ({
  releaseId: "v4.12",
  version: "4.12",
  releaseDate: "2026-06-29",
  affectedCount: 6,
  controlCount: 19,
  grp,
  month,
  transactions,
  offlineSynced,
});

describe("buildUsageComparison", () => {
  test("no rows means no anomaly: null, so the account shows no chart", () => {
    expect(buildUsageComparison("C02", [])).toBeNull();
  });

  test("one point per month, sorted, with both groups and the release metadata", () => {
    const c = buildUsageComparison("C03", [row("control", "2026-07", 240.04, 94), row("affected", "2026-07", 73.33, 5), row("affected", "2026-06", 113, 45)])!;
    expect(c.release).toEqual({ id: "v4.12", version: "4.12", date: "2026-06-29" });
    expect(c.affectedCount).toBe(6);
    expect(c.controlCount).toBe(19);
    expect(c.points.map((p) => p.month)).toEqual(["2026-06", "2026-07"]);
    expect(c.points[1]).toEqual({ month: "2026-07", affected: { transactions: 73.3, offlineSynced: 5 }, control: { transactions: 240, offlineSynced: 94 } });
  });

  test("a missing group or null metric stays null (a gap, never 0)", () => {
    const c = buildUsageComparison("C03", [row("affected", "2026-08", 74, null)])!;
    expect(c.points[0].affected.offlineSynced).toBeNull();
    expect(c.points[0].control).toEqual({ transactions: null, offlineSynced: null });
  });
});
