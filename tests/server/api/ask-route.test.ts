// POST /api/ask (F-14): input validation and status codes. Graph and LLM are mocked.
import { describe, expect, mock, test } from "bun:test";
import { MockLanguageModelV4 } from "ai/test";

let llmConfigured = true;
mock.module("../../../src/server/neo4j", () => ({ readCypher: async () => [] }));
mock.module("../../../src/server/ai/provider", () => ({
  getLlmModel: () => {
    if (!llmConfigured) throw new Error("LLM environment is incomplete: LLM_API_KEY");
    return new MockLanguageModelV4({
      doGenerate: async () => ({
        content: [{ type: "text", text: '{"answer":"-","claims":[]}' }],
        finishReason: { unified: "stop", raw: undefined },
        usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } },
        warnings: [],
      }),
    });
  },
}));

const { POST, maxDuration } = await import("../../../src/app/api/ask/route");

const post = (body: string) => POST(new Request("http://localhost/api/ask", { method: "POST", body }));

describe("POST /api/ask", () => {
  test("maxDuration is 60 s", () => {
    expect(maxDuration).toBe(60);
  });

  test("400 for a body that is not JSON", async () => {
    expect((await post("nope")).status).toBe(400);
  });

  test("400 for a missing, too short or too long question", async () => {
    expect((await post("{}")).status).toBe(400);
    expect((await post(JSON.stringify({ question: "a" }))).status).toBe(400);
    expect((await post(JSON.stringify({ question: "x".repeat(501) }))).status).toBe(400);
  });

  test("200 with a business result; the PRD field name `pertanyaan` is accepted", async () => {
    const res = await post(JSON.stringify({ pertanyaan: "Resep nasi goreng?" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "refused", claims: [] });
  });

  test("incomplete LLM env → 200 failed, without leaking configuration", async () => {
    llmConfigured = false;
    const res = await post(JSON.stringify({ question: "Akun mana paling berisiko?" }));
    llmConfigured = true;
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("failed");
    expect(JSON.stringify(json)).not.toContain("LLM_API_KEY");
  });
});
