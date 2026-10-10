import { describe, expect, test } from "bun:test";
import { accountMarkdown, markdownFileName } from "../../src/lib/account-markdown";
import { EMPTY_APPROVAL, approvalKey, decide, parseApproval } from "../../src/lib/action-approval";
import { citedIds, evidenceHref, statusCopy } from "../../src/lib/ask";
import { signalKey, simulate } from "../../src/lib/what-if";
import type { AccountExplanation, RetentionCard, RiskRow, Signal } from "../../src/types/graph";

const sig = (code: string, weight: number, since = "2026-08-15"): Signal => ({ account: "C01", code, weight, evidenceIds: ["C01", "K017"], facts: { kontak: "K017", pindah_ke: ["P01"] }, since });

describe("F-14 ask helpers", () => {
  test("account IDs link to the account page, other IDs do not", () => {
    const route = (id: string) => `/accounts/${id}`;
    expect(evidenceHref("C01", route)).toBe("/accounts/C01");
    expect(evidenceHref("P01", route)).toBeNull();
    expect(evidenceHref("K017", route)).toBeNull();
  });
  test("status copy covers every status", () => {
    expect(statusCopy("ok").tone).toBe("ok");
    expect(statusCopy("partial").tone).toBe("warn");
    expect(statusCopy("refused").tone).toBe("warn");
    expect(statusCopy("failed").tone).toBe("error");
  });
  test("cited IDs are unique and keep their order", () => {
    expect(citedIds([{ evidenceIds: ["C01", "K017"] }, { evidenceIds: ["K017", "P01"] }])).toEqual(["C01", "K017", "P01"]);
  });
});

describe("F-29 what-if", () => {
  const signals = [sig("CHAMPION_KELUAR", 3), sig("JANJI_DILANGGAR", 3, "2025-11-28"), sig("KOMPETITOR_DISEBUT", 2, "2026-09-18")];
  const account = { renewalDays: 75, annualValue: 149_940_000, dashboard: "Green" as const };

  test("all signals on gives a higher score than with signals turned off", () => {
    const all = simulate(signals, new Set(signals.map(signalKey)), account);
    const none = simulate(signals, new Set(), account);
    expect(all.score).toBeGreaterThan(none.score);
    expect(none.score).toBe(0);
    expect(none.level).toBe("Safe");
    expect(none.diverges).toBe(false);
  });
  test("value at risk follows the level's p", () => {
    const r = simulate(signals, new Set(signals.map(signalKey)), account);
    expect(r.atRisk).toBeCloseTo(account.annualValue * r.p);
  });
});

describe("F-25 action approval", () => {
  test("storage key is per account and action", () => {
    expect(approvalKey("C01", "COMPETITIVE_RETENTION_REVIEW")).toBe("churn-graph:approval:C01:COMPETITIVE_RETENTION_REVIEW");
  });
  test("malformed or missing storage falls back to pending", () => {
    expect(parseApproval(null)).toEqual(EMPTY_APPROVAL);
    expect(parseApproval("{oops")).toEqual(EMPTY_APPROVAL);
    expect(parseApproval(JSON.stringify({ owner: "Sari", due: "not-a-date", decision: "maybe" }))).toEqual({ ...EMPTY_APPROVAL, owner: "Sari" });
  });
  test("deciding records the time; deciding the same again resets to pending", () => {
    const now = new Date("2026-10-10T08:00:00Z");
    const approved = decide(EMPTY_APPROVAL, "approved", now);
    expect(approved).toMatchObject({ decision: "approved", decidedAt: "2026-10-10T08:00:00.000Z" });
    expect(decide(approved, "approved", now)).toMatchObject({ decision: "pending", decidedAt: null });
    expect(decide(approved, "rejected", now).decision).toBe("rejected");
  });
});

describe("F-30 markdown export", () => {
  const row: RiskRow = { account: "C01", name: "Kopi Lintas Nusantara", dashboard: "Green", level: "Critical", score: 10, diverges: true, renewalDays: 75, annualValue: 149_940_000, atRiskValue: 89_964_000, p: 0.6, topSignals: [] };
  const explanation: AccountExplanation = { account: "C01", name: row.name, level: "Critical", status: "at_risk", rules: [{ code: "CHAMPION_KELUAR", status: "triggered", weight: 3 }], featureRequestTickets: { count: 0, ticketIds: [], titles: [] } };
  const retention: RetentionCard = { account: "C01", level: "Critical", atRiskValue: 89_964_000, p: 0.6, annualValue: 149_940_000, actions: [] };

  test("contains the summary, signals with facts and evidence, rules and actions", () => {
    const md = accountMarkdown({ row, signals: [sig("CHAMPION_KELUAR", 3)], explanation, retention, renewalDate: "2026-12-15", snapshotDate: "2026-10-01" });
    expect(md.startsWith("# C01 · Kopi Lintas Nusantara\n")).toBe(true);
    expect(md).toContain("- Level: **Critical** (dashboard: Green, diverges from the findings)");
    expect(md).toContain("### Champion left (weight 3, since 2026-08-15)");
    expect(md).toContain("- pindah ke: P01");
    expect(md).toContain("- Evidence: C01, K017");
    expect(md).toContain("No action is recommended.");
    expect(md).not.toMatch(/\n{3,}/);
  });
  test("file name carries account and snapshot", () => {
    expect(markdownFileName("C01", "2026-10-01")).toBe("churn-graph-C01-2026-10-01.md");
  });
});
