import { describe, expect, test } from "bun:test";
import { AskResponseSchema, ClaimSchema, GraphPayloadSchema, RiskRowSchema, SignalSchema, validateGraphPayload, type GraphPayload } from "../../src/types/graph";

const node = (id: string) => ({ id, label: "Akun", props: {}, source_file: "crm_accounts.csv", source_id: id });
const edge = (id: string, source: string, target: string) => ({ id, source, target, type: "MEMILIKI", props: {}, source_file: "contracts_billing.csv", source_id: id, derived: false });
const payload = (over: Partial<GraphPayload> = {}): GraphPayload => ({
  nodes: [node("C01"), node("K-C01")],
  edges: [edge("e1", "C01", "K-C01")],
  highlight: ["C01"],
  meta: { account: "C01", nodeCount: 2, edgeCount: 1 },
  ...over,
});

describe("GraphPayload", () => {
  test("a consistent payload validates", () => {
    expect(GraphPayloadSchema.safeParse(payload()).success).toBe(true);
    expect(validateGraphPayload(payload())).toEqual({ ok: true, errors: [] });
  });

  test("a node without source_file is rejected by the schema", () => {
    const bad = payload({ nodes: [{ ...node("C01"), source_file: "" }] });
    expect(GraphPayloadSchema.safeParse(bad).success).toBe(false);
  });

  test("validateGraphPayload reports duplicate nodes and dangling relationships", () => {
    const bad = payload({ nodes: [node("C01"), node("C01")], edges: [edge("e1", "C01", "MISSING")] });
    const { ok, errors } = validateGraphPayload(bad);
    expect(ok).toBe(false);
    expect(errors).toEqual(["duplicate node: C01", "edge e1 points to a missing target: MISSING"]);
  });

  test("confidence must be within 0..1", () => {
    const bad = payload({ edges: [{ ...edge("e1", "C01", "K-C01"), derived: true, rule: "r", confidence: 1.5 }] });
    expect(GraphPayloadSchema.safeParse(bad).success).toBe(false);
  });
});

describe("Signal", () => {
  const valid = { account: "C01", code: "CHAMPION_KELUAR", weight: 3, evidenceIds: ["C01"], facts: { contact: "K017" }, since: "2026-08-15" };

  test("a valid signal passes", () => {
    expect(SignalSchema.safeParse(valid).success).toBe(true);
  });

  test("empty evidenceIds and a bad date are rejected", () => {
    expect(SignalSchema.safeParse({ ...valid, evidenceIds: [] }).success).toBe(false);
    expect(SignalSchema.safeParse({ ...valid, since: "15/08/2026" }).success).toBe(false);
  });
});

describe("RiskRow", () => {
  const row = { account: "C01", name: "x", dashboard: "Green", level: "Critical", score: 10, diverges: true, renewalDays: 75, annualValue: 1, atRiskValue: 1, p: 0.6, topSignals: [] };

  test("English levels and dashboard colours are accepted; the old Indonesian values are not", () => {
    expect(RiskRowSchema.safeParse(row).success).toBe(true);
    expect(RiskRowSchema.safeParse({ ...row, level: "Kritis" }).success).toBe(false);
    expect(RiskRowSchema.safeParse({ ...row, dashboard: "Hijau" }).success).toBe(false);
  });

  test("at most three top signals", () => {
    const s = { account: "C01", code: "A", weight: 1, evidenceIds: ["C01"], facts: {}, since: "2026-01-01" };
    expect(RiskRowSchema.safeParse({ ...row, topSignals: [s, s, s, s] }).success).toBe(false);
  });
});

describe("Claim and AskResponse", () => {
  test("a claim needs text and evidenceIds; quote is optional", () => {
    expect(ClaimSchema.safeParse({ text: "t", evidenceIds: ["a"] }).success).toBe(true);
    expect(ClaimSchema.safeParse({ text: "t" }).success).toBe(false);
  });

  test("an answer carries claims", () => {
    const base = { status: "ok", answer: "a", discarded: 0, toolsCalled: ["get_ranking"], durationMs: 1 };
    expect(AskResponseSchema.safeParse({ ...base, claims: [{ text: "t", evidenceIds: [] }] }).success).toBe(true);
    expect(AskResponseSchema.safeParse(base).success).toBe(false);
    expect(AskResponseSchema.safeParse({ ...base, claims: [], status: "sebagian" }).success).toBe(false);
  });
});
