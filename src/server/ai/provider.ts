// The only gateway to the LLM: an OpenAI-compatible client pointed at our own 9router endpoint.
// Final provider decision (Adrian + Dio, 2026-10-09). Endpoint, key and model come from the environment only — no values in code.
// Deliberately WITHOUT `import "server-only"` so the Bun script scripts/spike-llm.ts can use it;
// never import this module from a Client Component (it reads LLM_API_KEY).
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { llmEnv } from "../env";

/** Chat model for the Vercel AI SDK's `generateText`/`streamText`. Throws when the LLM environment is incomplete. */
export function getLlmModel() {
  const env = llmEnv();
  const provider = createOpenAICompatible({
    name: "9router",
    baseURL: env.LLM_BASE_URL.replace(/\/+$/, ""), // no trailing slash; the SDK appends /chat/completions
    apiKey: env.LLM_API_KEY,
  });
  return provider.chatModel(env.LLM_MODEL);
}
