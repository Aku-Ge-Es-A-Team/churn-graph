// POST /api/ask: request validation and structured errors (F-14 T13-06). The LLM is a mock model; the graph is never reached
// because these replies call no tool.
import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { MockLanguageModelV4 } from "ai/test";

let model: () => unknown;
// `server-only` is stubbed because Bun does not run with the react-server condition.
mock.module("server-only", () => ({}));
mock.module("../../../src/server/ai/provider", () => ({ getLlmModel: () => model() }));

const { POST } = await import("../../../src/app/api/ask/route");

const post = (body: unknown) => POST(new Request("http://localhost/api/ask", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

const replyingWith = (text: string) =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } },
      warnings: [],
    }),
  });

beforeEach(() => {
  model = () => replyingWith("{}");
  spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/ask", () => {
  test("200: a question that triggers no tool gets a polite refusal that suggests the presets", async () => {
    const res = await post({ question: "resep nasi goreng" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.refused).toBe(true);
    expect(body.answer).toContain("preset");
  });

  test("400 for a body that is not JSON, and for a missing or too short question", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect((await post({ question: "ab" })).status).toBe(400);
  });

  test("503 with a structured error when the LLM is not configured", async () => {
    model = () => {
      throw new Error("LLM environment is incomplete: LLM_API_KEY");
    };
    const res = await post({ question: "Mengapa C01 kritis?" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("llm_not_configured");
  });

  test("502 when the LLM call fails, without leaking the provider message or key", async () => {
    model = () =>
      new MockLanguageModelV4({
        doGenerate: async () => {
          throw Object.assign(new Error("Incorrect API key provided: sk-secret"), { statusCode: 401 });
        },
      });
    const res = await post({ question: "Mengapa C01 kritis?" });
    const text = await res.text();
    expect(res.status).toBe(502);
    expect(text).toContain("llm_unavailable");
    expect(text).not.toContain("sk-secret");
  });
});
