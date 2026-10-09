// SPIKE T00-12 -- skrip sementara, BUKAN bagian aplikasi (hapus/abaikan setelah A8 tervalidasi).
// Tujuan: membuktikan satu tool call lewat Vercel AI SDK ke endpoint OpenAI-compatible 9router,
// memakai klien yang sama dengan aplikasi (src/server/ai/provider.ts).
// Jalankan: bun scripts/spike-llm.ts   (Bun memuat .env.local otomatis)
// Env: LLM_BASE_URL, LLM_API_KEY, LLM_MODEL (lihat .env.example).
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

// Nonce acak: model tidak mungkin menebaknya, jadi muncul di jawaban hanya bila tool benar-benar dipanggil dan hasilnya kembali.
const nonce = randomBytes(4).toString("hex");

try {
  const result = await generateText({
    model,
    tools: {
      ambil_kode_verifikasi: tool({
        description: "Mengambil kode verifikasi sesi saat ini. Wajib dipanggil; kode tidak bisa ditebak.",
        inputSchema: z.object({ topik: z.string().describe("Topik singkat, bebas diisi") }),
        execute: async ({ topik }) => ({ topik, kode: nonce }),
      }),
    },
    stopWhen: isStepCount(3),
    prompt: "Panggil tool ambil_kode_verifikasi dengan topik 'spike', lalu tulis kode yang dikembalikan tool dalam satu kalimat.",
  });

  const calls = result.steps.flatMap((step) => step.toolCalls);
  const results = result.steps.flatMap((step) => step.toolResults);
  console.log("tool dipanggil :", calls.map((c) => `${c.toolName}(${JSON.stringify(c.input)})`).join(", ") || "(tidak ada)");
  console.log("hasil tool     :", results.map((r) => JSON.stringify(r.output)).join(", ") || "(tidak ada)");
  console.log("jawaban model  :", result.text.trim());

  const ok = calls.length > 0 && result.text.includes(nonce);
  console.log(ok ? "SPIKE LULUS: tool dipanggil dan hasilnya kembali ke model." : "SPIKE GAGAL: tool tidak dipanggil atau hasilnya tidak muncul di jawaban (A8 runtuh bila konsisten).");
  process.exit(ok ? 0 : 1);
} catch (error) {
  // Hanya status/pesan; header (berisi API key) tidak pernah dicetak.
  const e = error as { name?: string; statusCode?: number; message?: string };
  console.error(`SPIKE ERROR: ${e.name ?? "Error"}${e.statusCode ? ` HTTP ${e.statusCode}` : ""} -- ${String(e.message).slice(0, 300)}`);
  process.exit(1);
}
