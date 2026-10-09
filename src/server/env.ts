import { z } from "zod";

// Dibaca lazy agar `next build` tidak gagal hanya karena env belum diisi.
const neo4jSchema = z.object({
  NEO4J_URI: z.string().min(1),
  NEO4J_USERNAME: z.string().min(1),
  NEO4J_PASSWORD: z.string().min(1),
  NEO4J_DATABASE: z.string().min(1),
});

// Provider LLM = endpoint OpenAI-compatible 9router (keputusan final). Lihat src/server/ai/provider.ts.
const llmSchema = z.object({
  LLM_BASE_URL: z.url(), // mis. https://host/v1 (tanpa /chat/completions)
  LLM_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().min(1), // id persis dari GET {LLM_BASE_URL}/models
});

function parse<T extends z.ZodType>(schema: T, group: string): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    // Hanya nama variabel yang disebut, nilainya tidak.
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Env ${group} belum lengkap: ${missing}. Isi di .env.local (lihat .env.example).`);
  }
  return result.data;
}

let neo4jCache: z.infer<typeof neo4jSchema> | undefined;
let llmCache: z.infer<typeof llmSchema> | undefined;

export const neo4jEnv = () => (neo4jCache ??= parse(neo4jSchema, "Neo4j"));
export const llmEnv = () => (llmCache ??= parse(llmSchema, "LLM"));
