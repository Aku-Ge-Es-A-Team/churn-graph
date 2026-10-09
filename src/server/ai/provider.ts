// Satu-satunya pintu ke LLM: client OpenAI-compatible yang menunjuk ke endpoint 9router milik sendiri.
// Keputusan final provider (Adrian + Dio, 2026-10-09). Endpoint, key, dan model hanya dari env -- tidak ada nilai di kode.
// Sengaja TANPA `import "server-only"` agar skrip Bun (scripts/spike-llm.ts) bisa memakainya;
// jangan impor modul ini dari Client Component (isinya membaca LLM_API_KEY).
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { llmEnv } from "../env";

/** Model chat untuk `generateText`/`streamText` dari Vercel AI SDK. Melempar Error bila env LLM belum lengkap. */
export function getLlmModel() {
  const env = llmEnv();
  const provider = createOpenAICompatible({
    name: "9router",
    baseURL: env.LLM_BASE_URL.replace(/\/+$/, ""), // tanpa slash akhir; SDK menambahkan /chat/completions
    apiKey: env.LLM_API_KEY,
  });
  return provider.chatModel(env.LLM_MODEL);
}
