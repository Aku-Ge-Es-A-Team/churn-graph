// getLlmModel(): provider selection from LLM_PROVIDER. No network calls; the env is stubbed and the model objects are only inspected.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

const KEYS = ["LLM_PROVIDER", "GEMINI_API_KEY", "GEMINI_MODEL", "LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"] as const;
const saved: Record<string, string | undefined> = {};

// llmEnv() caches its result, so each test imports a fresh copy of the modules.
const load = async () => {
  const q = `?t=${Math.random()}`;
  return (await import(`../../../src/server/ai/provider${q}`)) as typeof import("../../../src/server/ai/provider");
};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("getLlmModel", () => {
  test("defaults to Gemini when LLM_PROVIDER is unset", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "test-model";
    const model = (await load()).getLlmModel();
    expect(model.modelId).toBe("test-model");
    expect(model.provider).toContain("google");
  });

  test("uses 9router when LLM_PROVIDER=9router", async () => {
    process.env.LLM_PROVIDER = "9router";
    process.env.LLM_BASE_URL = "https://example.test/v1/";
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_MODEL = "router-model";
    const model = (await load()).getLlmModel();
    expect(model.modelId).toBe("router-model");
    expect(model.provider).toContain("9router");
  });

  test("error names the missing Gemini variables but never a value", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_MODEL = "test-model";
    const { getLlmModel } = await load();
    expect(() => getLlmModel()).toThrow(/GEMINI_API_KEY/);
    expect(() => getLlmModel()).not.toThrow(/test-model/);
  });

  test("rejects an unknown provider", async () => {
    process.env.LLM_PROVIDER = "other";
    const { getLlmModel } = await load();
    expect(() => getLlmModel()).toThrow(/LLM_PROVIDER/);
  });
});
