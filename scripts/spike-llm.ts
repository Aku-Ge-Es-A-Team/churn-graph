// SPIKE T00-12 -- temporary script, NOT part of the application (delete/ignore once A8 is validated).
// Goal: prove one tool call through the Vercel AI SDK to the OpenAI-compatible 9router endpoint,
// using the same client as the application (src/server/ai/provider.ts).
// Run: bun scripts/spike-llm.ts   (Bun loads .env.local automatically)
// Env: LLM_BASE_URL, LLM_API_KEY, LLM_MODEL (see .env.example).
import { generateText, isStepCount, tool } from "ai";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getLlmModel } from "../src/server/ai/provider";

let model: ReturnType<typeof getLlmModel>;
try {
  model = getLlmModel();
} catch (error) {
  console.error(String((error as Error).message));
  process.exit(2);
}

// Random nonce: the model cannot guess it, so it only appears in the answer if the tool was really called and its result came back.
const nonce = randomBytes(4).toString("hex");

try {
  const result = await generateText({
    model,
    tools: {
      get_verification_code: tool({
        description: "Fetches the verification code of the current session. It must be called; the code cannot be guessed.",
        inputSchema: z.object({ topic: z.string().describe("Short topic, free-form") }),
        execute: async ({ topic }) => ({ topic, code: nonce }),
      }),
    },
    stopWhen: isStepCount(3),
    prompt: "Call the tool get_verification_code with the topic 'spike', then write the code returned by the tool in one sentence.",
  });

  const calls = result.steps.flatMap((step) => step.toolCalls);
  const results = result.steps.flatMap((step) => step.toolResults);
  console.log("tool called    :", calls.map((c) => `${c.toolName}(${JSON.stringify(c.input)})`).join(", ") || "(none)");
  console.log("tool result    :", results.map((r) => JSON.stringify(r.output)).join(", ") || "(none)");
  console.log("model answer   :", result.text.trim());

  const ok = calls.length > 0 && result.text.includes(nonce);
  console.log(ok ? "SPIKE PASSED: the tool was called and its result came back to the model." : "SPIKE FAILED: the tool was not called or its result did not appear in the answer (A8 collapses if this is consistent).");
  process.exit(ok ? 0 : 1);
} catch (error) {
  // Only status/message; headers (which contain the API key) are never printed.
  const e = error as { name?: string; statusCode?: number; message?: string };
  console.error(`SPIKE ERROR: ${e.name ?? "Error"}${e.statusCode ? ` HTTP ${e.statusCode}` : ""} -- ${String(e.message).slice(0, 300)}`);
  process.exit(1);
}
