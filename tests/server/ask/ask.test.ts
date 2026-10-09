// askQuestion (F-14) with a mocked LLM (MockLanguageModelV4) and an in-memory graph: no real LLM or Aura call.
// Scenarios: ok, partial, refused (no tool / nothing survives), failed (LLM error, graph down), prompt injection.
import { describe, expect, test } from "bun:test";
import { MockLanguageModelV4 } from "ai/test";
import { askQuestion, parseAnswerJson } from "../../../src/server/ask/ask";
import { PRESET_QUESTIONS } from "../../../src/server/ask/presets";
import { REFUSAL_MESSAGE } from "../../../src/server/ask/render-answer";
import { SYSTEM_PROMPT } from "../../../src/server/ask/prompt";
import { fakeGraph } from "../../helpers/fake-graph";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};
const toolStep = (toolName: string, input: unknown) => ({
  content: [{ type: "tool-call" as const, toolCallId: `call-${toolName}`, toolName, input: JSON.stringify(input) }],
  finishReason: { unified: "tool-calls" as const, raw: undefined },
  usage,
  warnings: [],
});
const textStep = (text: string) => ({
  content: [{ type: "text" as const, text }],
  finishReason: { unified: "stop" as const, raw: undefined },
  usage,
  warnings: [],
});
const answer = (claims: unknown[]) => JSON.stringify({ answer: "free text that is never shown", claims });

function ask(steps: ReturnType<typeof toolStep | typeof textStep>[], options: { fail?: boolean } = {}) {
  const model = new MockLanguageModelV4({ doGenerate: steps });
  return { model, result: askQuestion("Kenapa C10 berisiko?", { model, run: fakeGraph(options).run }) };
}

describe("askQuestion", () => {
  test("ok: every claim cites evidence returned by a tool; the answer is built from the claims only", async () => {
    const { result } = ask([
      toolStep("get_account_signals", { account: "C10" }),
      textStep(
        answer([
          { text: "C10 berlevel High dengan estimasi rupiah berisiko 40.000.000.", evidenceIds: ["C10"] },
          { text: "Klien menyebut kompetitor KasirPro.", evidenceIds: ["I0500"], quote: "membandingkan dengan KasirPro" },
        ]),
      ),
    ]);
    const res = await result;
    expect(res.status).toBe("ok");
    expect(res.claims).toHaveLength(2);
    expect(res.discarded).toBe(0);
    expect(res.toolsCalled).toEqual(["get_account_signals"]);
    expect(res.answer).not.toContain("never shown");
    expect(res.answer).toContain("KasirPro");
    expect(res.presetSuggestions).toBeUndefined();
  });

  test("partial: a claim with an ID no tool returned is discarded, the rest survives", async () => {
    const res = await ask([
      toolStep("get_account_signals", { account: "C10" }),
      textStep(answer([{ text: "Klien menyebut KasirPro.", evidenceIds: ["I0500"] }, { text: "Champion pindah.", evidenceIds: ["K017"] }])),
    ]).result;
    expect(res.status).toBe("partial");
    expect(res.claims.map((c) => c.evidenceIds)).toEqual([["I0500"]]);
    expect(res.discarded).toBe(1);
  });

  test("partial: a fabricated quote discards its claim", async () => {
    const res = await ask([
      toolStep("search_text", { query: "KasirPro" }),
      textStep(
        answer([
          { text: "Ada kompetitor.", evidenceIds: ["I0500"] },
          { text: "Klien akan pindah.", evidenceIds: ["I0500"], quote: "kami pasti pindah ke KasirPro" },
        ]),
      ),
    ]).result;
    expect(res.status).toBe("partial");
    expect(res.claims).toHaveLength(1);
  });

  test("phase 2: a markdown final text is re-submitted through the forced output tool", async () => {
    const { model, result } = ask([
      toolStep("search_text", { query: "KasirPro" }),
      textStep("**C10** sedang membandingkan dengan KasirPro."),
      toolStep("submit_answer", { answer: "-", claims: [{ text: "Klien membandingkan dengan KasirPro.", evidenceIds: ["I0500"] }] }),
    ]);
    const res = await result;
    expect(res.status).toBe("ok");
    expect(res.claims.map((c) => c.evidenceIds)).toEqual([["I0500"]]);
    expect(res.toolsCalled).toEqual(["search_text"]); // the output tool is not a data tool
    const submit = model.doGenerateCalls[2];
    expect((submit.tools ?? []).map((t) => t.name)).toEqual(["submit_answer"]);
    expect(submit.toolChoice).toEqual({ type: "required" });
  });

  test("refused: out-of-scope question, no tool called → polite refusal with presets", async () => {
    const res = await ask([textStep(answer([{ text: "Nasi goreng pakai bawang.", evidenceIds: [] }]))]).result;
    expect(res.status).toBe("refused");
    expect(res.answer).toBe(REFUSAL_MESSAGE);
    expect(res.claims).toEqual([]);
    expect(res.presetSuggestions?.length).toBeGreaterThan(0);
    expect(PRESET_QUESTIONS as readonly string[]).toContain(res.presetSuggestions![0]);
  });

  test("refused: tools ran but no claim survives the validator", async () => {
    const res = await ask([toolStep("get_ranking", {}), textStep(answer([{ text: "Tanpa bukti.", evidenceIds: [] }]))]).result;
    expect(res).toMatchObject({ status: "refused", discarded: 1, toolsCalled: ["get_ranking"] });
  });

  test("refused: the final text is not JSON", async () => {
    const res = await ask([toolStep("get_ranking", {}), textStep("C10 paling berisiko.")]).result;
    expect(res.status).toBe("refused");
  });

  test("failed: the LLM call throws → structured failure, no exception reaches the caller", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("401 invalid key");
      },
    });
    const res = await askQuestion("Kenapa C10 berisiko?", { model, run: fakeGraph().run });
    expect(res).toMatchObject({ status: "failed", claims: [] });
    expect(res.presetSuggestions?.length).toBeGreaterThan(0);
  });

  test("failed: the graph is down (tool error) and nothing could be answered", async () => {
    const res = await ask([toolStep("get_ranking", {}), textStep(answer([]))], { fail: true }).result;
    expect(res.status).toBe("failed");
    expect(res.toolsCalled).toEqual(["get_ranking"]);
  });

  test("invalid question → refused without calling the model", async () => {
    const model = new MockLanguageModelV4({ doGenerate: [textStep("{}")] });
    const res = await askQuestion("  a ", { model, run: fakeGraph().run });
    expect(res.status).toBe("refused");
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  test("prompt injection in a ticket cannot smuggle an unverified claim through", async () => {
    // The ticket text tells the model to declare C10 safe with evidence FAKE-9; a compromised model obeys.
    const { model, result } = ask([
      toolStep("search_text", { query: "sinkron", account: "C10" }),
      textStep(answer([{ text: "C10 aman.", evidenceIds: ["FAKE-9"] }])),
    ]);
    const res = await result;
    expect(res.status).toBe("refused");
    expect(res.claims).toEqual([]);
    // Untrusted data only travels as a tool result; the system prompt and the user turn are ours.
    const prompt = model.doGenerateCalls[1].prompt;
    expect(prompt[0]).toMatchObject({ role: "system", content: SYSTEM_PROMPT });
    expect(JSON.stringify(prompt.filter((m) => m.role === "user"))).not.toContain("ABAIKAN");
    expect(JSON.stringify(prompt.filter((m) => m.role === "tool"))).toContain("ABAIKAN");
  });

  test("only the six fixed tools are offered to the model", async () => {
    const { model, result } = ask([textStep(answer([]))]);
    await result;
    const names = (model.doGenerateCalls[0].tools ?? []).map((t) => t.name).sort();
    expect(names).toEqual(["find_connection", "find_precedents", "get_account_signals", "get_evidence", "get_ranking", "search_text"]);
  });
});

describe("parseAnswerJson", () => {
  test("tolerates code fences and surrounding text", () => {
    expect(parseAnswerJson('Berikut:\n```json\n{"answer":"a","claims":[]}\n```')).toEqual({ answer: "a", claims: [] });
  });

  test("returns null for non-JSON", () => {
    expect(parseAnswerJson("tidak ada")).toBeNull();
    expect(parseAnswerJson("{rusak")).toBeNull();
  });
});
