import { describe, expect, test } from "bun:test";
import { EvidenceRegistry } from "../../../src/server/ask/evidence";
import { validateAnswer, type ValidationResult } from "../../../src/server/ask/validate-citations";

function makeRegistry(): EvidenceRegistry {
  const r = new EvidenceRegistry();
  r.add([
    { id: "email-1", source_file: "emails.csv", source_id: "E-001", text: "We   are considering\nmoving to another vendor because prices went up 15%." },
    { id: "ticket-7", source_file: "tickets.csv", source_id: "T-007", text: "The receipt printer jams often since the update." },
    { id: "usage-c01", source_file: "usage.csv", source_id: "U-C01-2026-08", props: { transactions: 1200, drop_percent: 40 } },
    { id: "meeting-2", source_file: "meetings.csv", source_id: "M-002", text: "The customer said “service is slow” last week." },
    { id: "contract-c01", source_file: "contracts.csv", source_id: "K-C01", text: "Annual contract value Rp 252 million." },
  ]);
  return r;
}

// Every result is collected for the property test at the end of the file.
const allResults: ValidationResult[] = [];
function run(input: unknown): ValidationResult {
  const result = validateAnswer(input, makeRegistry());
  allResults.push(result);
  return result;
}
const one = (claim: unknown) => run({ answer: "x", claims: [claim] });

describe("validateAnswer — per-claim rules", () => {
  test("valid evidence and a substring quote → passes", () => {
    const r = one({ text: "The customer is considering a move.", evidenceIds: ["email-1"], quote: "moving to another vendor" });
    expect(r.passed).toHaveLength(1);
    expect(r.valid).toBe(true);
  });

  test("empty evidenceIds → discarded as no_evidence", () => {
    const r = one({ text: "The customer will churn.", evidenceIds: [] });
    expect(r.discarded[0].reasons).toEqual(["no_evidence"]);
    expect(r.valid).toBe(false);
  });

  test("one fake ID among valid ones → discarded as unknown_evidence and the ID is reported", () => {
    const r = one({ text: "The customer is unhappy.", evidenceIds: ["email-1", "fake-9"] });
    expect(r.discarded[0].reasons).toEqual(["unknown_evidence"]);
    expect(r.discarded[0].offendingIds).toEqual(["fake-9"]);
  });

  test("an invented quote → discarded as quote_mismatch", () => {
    const r = one({ text: "The customer is unhappy.", evidenceIds: ["email-1"], quote: "will cancel the contract next month" });
    expect(r.discarded[0].reasons).toEqual(["quote_mismatch"]);
  });

  test("same quote with different whitespace/newlines → passes", () => {
    const r = one({ text: "The customer is considering a move.", evidenceIds: ["email-1"], quote: "We are considering moving" });
    expect(r.passed).toHaveLength(1);
  });

  test("curly vs straight quotation marks → passes", () => {
    const r = one({ text: "The customer complains about service.", evidenceIds: ["meeting-2"], quote: 'said "service is slow"' });
    expect(r.passed).toHaveLength(1);
  });

  test("a quote that differs only in letter case → discarded", () => {
    const r = one({ text: "The customer is considering a move.", evidenceIds: ["email-1"], quote: "we are considering moving" });
    expect(r.discarded[0].reasons).toEqual(["quote_mismatch"]);
  });

  test("a quote that cites evidence without text → discarded as quote_without_source_text", () => {
    const r = one({ text: "Usage dropped.", evidenceIds: ["usage-c01"], quote: "transactions dropped sharply" });
    expect(r.discarded[0].reasons).toEqual(["quote_without_source_text"]);
  });

  test("a quote shorter than 8 characters → flagged, not discarded", () => {
    const r = one({ text: "The customer mentions prices.", evidenceIds: ["email-1"], quote: "prices" });
    expect(r.discarded).toHaveLength(0);
    expect(r.passed).toHaveLength(0);
    expect(r.flagged[0].reasons).toEqual(["quote_too_short"]);
  });

  test("a number that is not in the evidence → flagged as number_not_found", () => {
    const r = one({ text: "Prices go up 20%.", evidenceIds: ["email-1"] });
    expect(r.flagged[0].reasons).toEqual(["number_not_found"]);
  });

  test('"15 %" vs "15%" → not flagged', () => {
    expect(one({ text: "Prices go up 15 %.", evidenceIds: ["email-1"] }).passed).toHaveLength(1);
  });

  test("a number found in the evidence props → not flagged", () => {
    expect(one({ text: "Transactions dropped 40% to 1.200.", evidenceIds: ["usage-c01"] }).passed).toHaveLength(1);
  });

  test('"Rp 252 jt" vs "Rp 252 million" → not flagged', () => {
    expect(one({ text: "Annual value Rp 252 jt.", evidenceIds: ["contract-c01"] }).passed).toHaveLength(1);
  });

  test("a real quote from evidence A while the claim cites only evidence B → discarded", () => {
    const r = one({ text: "The customer wants to leave.", evidenceIds: ["ticket-7"], quote: "moving to another vendor" });
    expect(r.discarded[0].reasons).toEqual(["quote_mismatch"]);
  });

  test("a mix of valid and invalid claims → valid is true and the lists are separate", () => {
    const r = run({
      claims: [
        { text: "The printer jams often.", evidenceIds: ["ticket-7"] },
        { text: "The customer will certainly churn.", evidenceIds: [] },
        { text: "Prices go up 99%.", evidenceIds: ["email-1"] },
      ],
    });
    expect(r.valid).toBe(true);
    expect(r.passed.map((c) => c.text)).toEqual(["The printer jams often."]);
    expect(r.flagged.map((d) => d.claim.text)).toEqual(["Prices go up 99%."]);
    expect(r.discarded).toHaveLength(1);
  });
});

describe("validateAnswer — broken LLM input", () => {
  const broken: unknown[] = [
    null,
    undefined,
    "",
    "plain text answer",
    42,
    [],
    {},
    { answer: "x" },
    { claims: "not an array" },
    { claims: null },
    {
      claims: [
        null,
        1,
        "x",
        { text: "no evidenceIds" },
        { evidenceIds: ["email-1"] },
        { text: "", evidenceIds: ["email-1"] },
        { text: "   ", evidenceIds: ["email-1"] },
        { text: 5, evidenceIds: "email-1" },
        { text: "ids are not strings", evidenceIds: [1, 2] },
      ],
    },
  ];

  test.each(broken.map((x) => [x]))("does not throw and the result is safe: %p", (input: unknown) => {
    const r = run(input);
    expect(r.valid).toBe(false);
    expect(r.passed).toEqual([]);
    expect(r.flagged).toEqual([]);
  });
});

describe("property", () => {
  test("no passed or flagged claim has empty evidenceIds or IDs outside the registry", () => {
    const known = new Set(makeRegistry().ids());
    expect(allResults.length).toBeGreaterThan(20);
    for (const r of allResults) {
      for (const c of [...r.passed, ...r.flagged.map((d) => d.claim)]) {
        expect(c.evidenceIds.length).toBeGreaterThan(0);
        for (const id of c.evidenceIds) expect(known.has(id)).toBe(true);
      }
    }
  });
});
