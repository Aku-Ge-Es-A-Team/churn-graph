import { describe, expect, test } from "bun:test";
import { createIntentClassifier, HINT_MIN_CONFIDENCE, OUT_OF_SCOPE_MIN_CONFIDENCE, shouldRefuseEarly, toolHint } from "@/server/ask/intent";
import type { JevJudge } from "@/server/ai/jev";

const answer = (choice: string, confidence: number): JevJudge => async () => ({ intent: { type: "choice", choice, probabilities: { [choice]: 1 }, confidence } });

describe("intent routing (JEV AI)", () => {
  test("classifier returns the chosen intent and confidence", async () => {
    expect(await createIntentClassifier(answer("promise_approval", 0.93))("What was promised to C01?")).toEqual({ intent: "promise_approval", confidence: 0.93 });
  });

  test("classifier returns null when JEV fails or answers with an unknown intent", async () => {
    expect(await createIntentClassifier(async () => null)("anything")).toBeNull();
    expect(await createIntentClassifier(answer("made_up", 0.99))("anything")).toBeNull();
  });

  test("refuses early only for a confident out_of_scope", () => {
    expect(shouldRefuseEarly({ intent: "out_of_scope", confidence: OUT_OF_SCOPE_MIN_CONFIDENCE })).toBe(true);
    expect(shouldRefuseEarly({ intent: "out_of_scope", confidence: OUT_OF_SCOPE_MIN_CONFIDENCE - 0.01 })).toBe(false);
    expect(shouldRefuseEarly({ intent: "ranking", confidence: 0.99 })).toBe(false);
    expect(shouldRefuseEarly(null)).toBe(false);
  });

  test("tool hint only for a confident in-scope intent", () => {
    expect(toolHint({ intent: "promise_approval", confidence: HINT_MIN_CONFIDENCE })).toContain("find_precedents");
    expect(toolHint({ intent: "ranking", confidence: 0.9 })).toContain("get_ranking");
    expect(toolHint({ intent: "promise_approval", confidence: HINT_MIN_CONFIDENCE - 0.01 })).toBe("");
    expect(toolHint({ intent: "out_of_scope", confidence: 0.99 })).toBe("");
    expect(toolHint(null)).toBe("");
  });
});
