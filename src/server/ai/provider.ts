// The only gateway to the LLM. LLM_PROVIDER picks Google Gemini (default, @ai-sdk/google) or the OpenAI-compatible 9router endpoint
// (kept as a manual fallback: change the env and restart; there is no automatic failover).
// Keys and model ids come from the environment only — no values in code.
// Deliberately WITHOUT `import "server-only"` so the Bun script scripts/spike-llm.ts can use it;
// never import this module from a Client Component (it reads API keys).
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { llmEnv } from "../env";

/** Chat model for the Vercel AI SDK's `generateText`/`streamText`. Throws when the LLM environment is incomplete. */
export function getLlmModel() {
  const env = llmEnv();
  if (env.LLM_PROVIDER === "gemini") {
    return createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY })(env.GEMINI_MODEL);
  }
  const provider = createOpenAICompatible({
    name: "9router",
    baseURL: env.LLM_BASE_URL.replace(/\/+$/, ""), // no trailing slash; the SDK appends /chat/completions
    apiKey: env.LLM_API_KEY,
  });
  return provider.chatModel(env.LLM_MODEL);
}

