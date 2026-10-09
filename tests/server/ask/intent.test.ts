import { describe, expect, test } from "bun:test";
import { ask, type GenerateFn } from "@/server/ask/ask";
import { createIntentClassifier, shouldRefuseEarly, toolHint, type ClassifyFn } from "@/server/ask/intent";
import type { JevJudge } from "@/server/ai/jev";

const answer = (choice: string, confidence: number): JevJudge => async () => ({ intent: { type: "choice", choice, probabilities: { [choice]: 1 }, confidence } });
const run = async () => [];

describe("intent routing (JEV AI)", () => {
  test("classifier returns the chosen intent and confidence", async () => {
    expect(await createIntentClassifier(answer("promise_approval", 0.93))("What was promised to C01?")).toEqual({ intent: "promise_approval", confidence: 0.93 });
  });

  test("classifier returns null when JEV fails or answers with an unknown intent", async () => {
    expect(await createIntentClassifier(async () => null)("anything")).toBeNull();
    expect(await createIntentClassifier(answer("made_up", 0.99))("anything")).toBeNull();
  });

  test("refuses early only for a confident out_of_scope; hints only for confident in-scope intents", () => {
    expect(shouldRefuseEarly({ intent: "out_of_scope", confidence: 0.9 })).toBe(true);
    expect(shouldRefuseEarly({ intent: "out_of_scope", confidence: 0.5 })).toBe(false);
    expect(shouldRefuseEarly({ intent: "ranking", confidence: 0.99 })).toBe(false);
    expect(shouldRefuseEarly(null)).toBe(false);
    expect(toolHint({ intent: "promise_approval", confidence: 0.9 })).toContain("find_precedents");
    expect(toolHint({ intent: "promise_approval", confidence: 0.4 })).toBe("");
    expect(toolHint(null)).toBe("");
  });

  test("ask(): an out-of-scope question is refused before the tool loop runs", async () => {
    let generated = false;
    const generate: GenerateFn = async () => ((generated = true), { text: "", toolsUsed: [] });
    const classify: ClassifyFn = async () => ({ intent: "out_of_scope", confidence: 0.95 });
    const result = await ask("nasi goreng recipe", { run, generate, classify });
    expect(result.refused).toBe(true);
    expect(result.toolsUsed).toEqual([]);
    expect(result.intent?.intent).toBe("out_of_scope");
    expect(generated).toBe(false);
  });

  test("ask(): the tool hint reaches the system prompt, and a failed classifier changes nothing", async () => {
    const systems: string[] = [];
    const generate: GenerateFn = async ({ system }) => (systems.push(system), { text: "", toolsUsed: [] });
    await ask("q", { run, generate, classify: async () => ({ intent: "ranking", confidence: 0.9 }) });
    await ask("q", { run, generate, classify: async () => null });
    await ask("q", { run, generate });
    expect(systems[0]).toContain("get_ranking");
    expect(systems[1]).toBe(systems[2]!);
  });
});
