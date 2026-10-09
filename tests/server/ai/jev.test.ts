import { describe, expect, test } from "bun:test";
import { createJevJudge, JEV_ENDPOINT, type JevQuestion } from "@/server/ai/jev";

const questions: Record<string, JevQuestion> = { at_risk: { type: "noul", instructions: "Is the customer at risk?" } };
const reply = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const judge = (fetchImpl: typeof fetch) => createJevJudge({ apiKey: "test-key", model: "jev-latest", fetchImpl, timeoutMs: 200 });

describe("JEV client", () => {
  test("sends the bearer key, model, state and questions, and returns typed answers", async () => {
    let captured: { url: string; init: RequestInit } | undefined;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return new Response(JSON.stringify({ model: "jev-1.13.0", answers: { at_risk: { type: "noul", noul: 0.81 } }, usage: {} }));
    }) as unknown as typeof fetch;

    const answers = await judge(fetchImpl)({ a: 1 }, questions);

    expect(answers?.at_risk).toEqual({ type: "noul", noul: 0.81 });
    expect(captured?.url).toBe(JEV_ENDPOINT);
    expect((captured?.init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    expect(JSON.parse(captured?.init.body as string)).toEqual({ state: { a: 1 }, model: "jev-latest", questions });
  });

  test("returns null on an HTTP error, malformed JSON, a missing or mistyped answer, and a network failure", async () => {
    expect(await judge(reply({ error: "unauthorized" }, 401))({}, questions)).toBeNull();
    expect(await judge(reply({ nothing: true }))({}, questions)).toBeNull();
    expect(await judge(reply({ answers: {} }))({}, questions)).toBeNull();
    expect(await judge(reply({ answers: { at_risk: { type: "choice", choice: "x", probabilities: { x: 1 }, confidence: 1 } } }))({}, questions)).toBeNull();
    expect(await judge((async () => { throw new Error("offline"); }) as unknown as typeof fetch)({}, questions)).toBeNull();
  });

  test("returns null when the request times out", async () => {
    const slow = ((_: string, init: RequestInit) => new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("timeout", "TimeoutError"))))) as unknown as typeof fetch;
    expect(await judge(slow)({}, questions)).toBeNull();
  });
});
