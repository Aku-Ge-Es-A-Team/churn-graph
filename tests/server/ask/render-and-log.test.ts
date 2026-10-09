import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { EvidenceRegistry } from "../../../src/server/ask/evidence";
import { REFUSAL_MESSAGE, VERIFY_MARKER, renderAnswer } from "../../../src/server/ask/render-answer";
import { validateAnswer } from "../../../src/server/ask/validate-citations";
import { getValidationStats, logValidation, resetValidationLog } from "../../../src/server/ask/validation-log";

const registry = new EvidenceRegistry();
registry.add([
  { id: "ticket-7", source_file: "tickets.csv", source_id: "T-007", text: "The receipt printer jams often since the update." },
  { id: "email-1", source_file: "emails.csv", source_id: "E-001", text: "Prices go up 15% this year." },
]);

describe("renderAnswer", () => {
  test("free LLM sentences without evidence never reach the display text", () => {
    const result = validateAnswer(
      {
        answer: "The printer jams. The customer WILL churn next month.",
        claims: [{ text: "The printer jams.", evidenceIds: ["ticket-7"], quote: "jams often" }],
      },
      registry,
    );
    const out = renderAnswer(result);
    expect(out.refused).toBe(false);
    expect(out.answer).toBe("The printer jams.");
    expect(out.answer).not.toContain("WILL churn");
  });

  test("no claim passes → refused with the preset message", () => {
    const result = validateAnswer({ answer: "The customer will churn.", claims: [{ text: "The customer will churn.", evidenceIds: ["fake"] }] }, registry);
    expect(renderAnswer(result)).toEqual({ answer: REFUSAL_MESSAGE, claims: [], refused: true });
  });

  test("flagged claims appear with a marker, after the passed claims", () => {
    const result = validateAnswer(
      {
        claims: [
          { text: "Prices go up 40%.", evidenceIds: ["email-1"] },
          { text: "The printer jams.", evidenceIds: ["ticket-7"] },
          { text: "No evidence.", evidenceIds: [] },
        ],
      },
      registry,
    );
    const out = renderAnswer(result);
    expect(out.answer).toBe(`The printer jams.\n${VERIFY_MARKER} Prices go up 40%.`);
    expect(out.claims.map((c) => c.text)).toEqual(["The printer jams.", "Prices go up 40%."]);
    expect(out.note).toContain("1 claim(s) need verification");
    expect(out.note).toContain("1 claim(s) were discarded");
  });
});

describe("validation log", () => {
  let infoSpy: ReturnType<typeof spyOn>;
  beforeEach(() => {
    resetValidationLog();
    infoSpy = spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => infoSpy.mockRestore());

  test("per-reason statistics and passed-claim count; claim text is never logged", () => {
    logValidation(
      validateAnswer({ claims: [{ text: "The printer jams.", evidenceIds: ["ticket-7"] }, { text: "SECRET without evidence.", evidenceIds: [] }] }, registry),
    );
    logValidation(validateAnswer({ claims: [{ text: "Prices go up 40%.", evidenceIds: ["email-1"] }] }, registry));

    expect(getValidationStats()).toEqual({ validations: 2, passedClaims: 1, perReason: { no_evidence: 1, number_not_found: 1 } });
    expect(infoSpy).toHaveBeenCalledTimes(2);
    const logged = infoSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("\n");
    expect(logged).not.toContain("SECRET");
    expect(logged).not.toContain("printer");
    expect(JSON.parse(String(infoSpy.mock.calls[0][0])).passed).toBe(1);
  });

  test("resetValidationLog empties the state", () => {
    logValidation(validateAnswer({ claims: [] }, registry));
    resetValidationLog();
    expect(getValidationStats()).toEqual({ validations: 0, passedClaims: 0, perReason: {} });
  });
});
