// Spike F-14: buktikan 1 tool call Gemini -> Neo4j berhasil end-to-end dan ukur latensi.
// Jalankan: bun run scripts/spike-llm.ts
import { generateText, isStepCount, tool } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { z } from "zod";
import { llmEnv } from "../src/server/env";
import { closeDriver, readCypher } from "../src/server/neo4j";

const AKUN = "C01";
const RUNS = 5;
const PROMPT = `Berapa jumlah data untuk akun ${AKUN}?`;

const hitungAkun = tool({
  description: "Menghitung jumlah node di graph yang terhubung langsung dengan ID akun pelanggan (mis. C01).",
  inputSchema: z.object({ akun: z.string().describe("ID akun, contoh: C01") }),
  execute: async ({ akun }) => {
    // Graph masih kosong pun aman: hasilnya 0.
    const [row] = await readCypher<{ jumlah: number }>(
      "OPTIONAL MATCH (a {id: $akun})--(n) RETURN count(n) AS jumlah",
      { akun },
    );
    return { akun, jumlah: row?.jumlah ?? 0 };
  },
});

type Row = { percobaan: number; toolDipanggil: string; argumenBenar: string; latensiMs: number; error: string };

const env = llmEnv();
const model = createGoogle({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY })(env.LLM_MODEL);
const rows: Row[] = [];

for (let i = 1; i <= RUNS; i++) {
  const t0 = performance.now();
  const row: Row = { percobaan: i, toolDipanggil: "tidak", argumenBenar: "tidak", latensiMs: 0, error: "-" };
  try {
    const { steps, text } = await generateText({
      model,
      tools: { hitungAkun },
      stopWhen: isStepCount(3),
      prompt: PROMPT,
    });
    const call = steps.flatMap((s) => s.toolCalls).find((c) => c.toolName === "hitungAkun");
    const toolError = steps.flatMap((s) => s.content).find((p) => p.type === "tool-error");
    row.toolDipanggil = call ? "ya" : "tidak";
    row.argumenBenar = (call?.input as { akun?: string } | undefined)?.akun === AKUN ? "ya" : "tidak";
    if (toolError) row.error = "tool-error";
    console.log(`#${i} jawaban: ${text.replace(/\s+/g, " ").slice(0, 120)}`);
  } catch (err) {
    // Nama + potongan pesan saja; API key dikirim via header, tidak ada di pesan.
    row.error = err instanceof Error ? `${err.name}: ${err.message.slice(0, 80)}` : "unknown";
  }
  row.latensiMs = Math.round(performance.now() - t0);
  rows.push(row);
}

console.table(rows);
const ok = rows.filter((r) => r.toolDipanggil === "ya" && r.argumenBenar === "ya" && r.error === "-");
const lat = rows.map((r) => r.latensiMs);
console.table([
  {
    model: env.LLM_MODEL,
    sukses: `${ok.length}/${RUNS}`,
    successRate: `${Math.round((ok.length / RUNS) * 100)}%`,
    latensiRataMs: Math.round(lat.reduce((a, b) => a + b, 0) / RUNS),
    latensiMaksMs: Math.max(...lat),
  },
]);

await closeDriver();
