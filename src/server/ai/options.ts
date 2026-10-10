// Per-request provider options for generateText. Kept apart from provider.ts so tests that mock the provider module stay valid.
// Gemini "thinking" models spend hundreds of reasoning tokens even on trivial prompts, which blows the ask pipeline's time budget;
// a low thinking level keeps the tool loop within it. Other providers ignore the `google` key.
export const LLM_PROVIDER_OPTIONS = { google: { thinkingConfig: { thinkingLevel: "low" } } } as const;
