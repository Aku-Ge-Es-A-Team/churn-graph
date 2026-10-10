import { z } from "zod";

// Read lazily so that `next build` does not fail just because the environment is not filled in.
const neo4jSchema = z.object({
  NEO4J_URI: z.string().min(1),
  NEO4J_USERNAME: z.string().min(1),
  NEO4J_PASSWORD: z.string().min(1),
  NEO4J_DATABASE: z.string().min(1),
});

// LLM provider = OpenAI-compatible 9router endpoint (final decision). See src/server/ai/provider.ts.
const llmSchema = z.object({
  LLM_BASE_URL: z.url(), // e.g. https://host/v1 (without /chat/completions)
  LLM_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().min(1), // exact id from GET {LLM_BASE_URL}/models
});

function parse<T extends z.ZodType>(schema: T, group: string): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    // Only variable names are reported, never their values.
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`${group} environment is incomplete: ${missing}. Fill it in .env.local (see .env.example).`);
  }
  return result.data;
}

let neo4jCache: z.infer<typeof neo4jSchema> | undefined;
let llmCache: z.infer<typeof llmSchema> | undefined;

export const neo4jEnv = () => (neo4jCache ??= parse(neo4jSchema, "Neo4j"));

/**
 * JEV AI (TypeSafe) is an OPTIONAL decision/classification/scoring layer. Without TYPESAFE_API_KEY this returns null and every
 * caller falls back to the rule-based behaviour. TYPESAFE_MODEL defaults to the flagship alias.
 */
export function jevEnv(): { apiKey: string; model: string } | null {
  const apiKey = process.env.TYPESAFE_API_KEY?.trim();
  if (!apiKey) return null;
  return { apiKey, model: process.env.TYPESAFE_MODEL?.trim() || "jev-latest" };
}
export const llmEnv = () => (llmCache ??= parse(llmSchema, "LLM"));
