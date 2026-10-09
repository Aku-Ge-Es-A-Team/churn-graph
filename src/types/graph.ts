import { z } from "zod";

// DRAF — dikirim ke Adrian (ETL & skema graph) untuk dikoreksi. Jangan dianggap final.
//
// KEPUTUSAN TERBUKA UNTUK ADRIAN:
// 1. Nama label node final (saat ini hanya `UsageBulan`, `Klaim` disebut spek, sisanya bebas).
// 2. Nama tipe relasi final (daftar di bawah baru yang disebut spek, belum lengkap).
// 3. Format `source_id` per sumber (apakah row index, primary key asli, atau gabungan?).
// 4. Format `id` node (UUID baru, atau turunan dari source_id + label?).
// 5. Apakah `sejak` pada Sinyal selalu tersedia untuk semua kode sinyal, atau ada yang tanpa tanggal?
// 6. Format kode sinyal (slug bebas? daftar tertutup? prefix per kategori?).

// --- Sumber data ---

export const SUMBER_DATA = ["crm", "interaksi", "usage", "tiket", "kontrak", "decision_log"] as const;
export type SumberData = (typeof SUMBER_DATA)[number];

// --- Node & Edge ---

// Label yang SUDAH disebut spesifikasi — belum final, skema milik Adrian.
export const LABEL_DIKENAL = ["UsageBulan", "Klaim"] as const;

export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(), // sengaja bukan enum tertutup, lihat LABEL_DIKENAL
  props: z.record(z.string(), z.unknown()),
  source_file: z.string().min(1),
  source_id: z.string().min(1),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

// Tipe relasi yang SUDAH disebut spesifikasi — belum final, skema milik Adrian.
export const TIPE_RELASI_DIKENAL = [
  "MENJALANKAN_VERSI",
  "Anomali",
  "MEMBALAS",
  "MENYEBUT",
  "KANDIDAT_DISEBABKAN_OLEH",
  "ALAMAT_EMAIL_DARI",
  "MENYETUJUI",
  "SALING_KENAL",
] as const;

export const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string(), // sengaja bukan enum tertutup, lihat TIPE_RELASI_DIKENAL
  props: z.record(z.string(), z.unknown()),
  source_file: z.string().min(1),
  source_id: z.string().min(1),
  derived: z.boolean(),
  rule: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  tanggal: z.iso.date().optional(),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

// --- Payload graph ---

export const GraphPayloadSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  meta: z.object({
    akun: z.string(),
    sinyal: z.string().optional(),
    jumlahNode: z.number(),
    jumlahRelasi: z.number(),
  }),
});
export type GraphPayload = z.infer<typeof GraphPayloadSchema>;

export function validateGraphPayload(payload: GraphPayload): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodeIds = new Set<string>();

  for (const node of payload.nodes) {
    if (nodeIds.has(node.id)) errors.push(`node duplikat: ${node.id}`);
    nodeIds.add(node.id);
    if (!node.source_file) errors.push(`node ${node.id} tanpa source_file`);
    if (!node.source_id) errors.push(`node ${node.id} tanpa source_id`);
  }

  for (const edge of payload.edges) {
    if (!nodeIds.has(edge.source)) errors.push(`edge ${edge.id} menunjuk source yang tidak ada: ${edge.source}`);
    if (!nodeIds.has(edge.target)) errors.push(`edge ${edge.id} menunjuk target yang tidak ada: ${edge.target}`);
    if (!edge.source_file) errors.push(`edge ${edge.id} tanpa source_file`);
    if (!edge.source_id) errors.push(`edge ${edge.id} tanpa source_id`);
  }

  return { ok: errors.length === 0, errors };
}

// --- Sinyal ---

export const SinyalSchema = z.object({
  akun: z.string(),
  kode: z.string(),
  bobot: z.number(),
  bukti_ids: z.array(z.string()).min(1),
  fakta: z.string(),
  sejak: z.iso.date(),
});
export type Sinyal = z.infer<typeof SinyalSchema>;

// --- Level & dashboard ---

export const LEVEL = ["Kritis", "Tinggi", "Waspada", "Aman"] as const;
export type Level = (typeof LEVEL)[number];

// ASUMSI A15: estimasi probabilitas churn per level, bukan hasil model.
export const P_LEVEL: Record<Level, number> = {
  Kritis: 0.6,
  Tinggi: 0.4,
  Waspada: 0.2,
  Aman: 0.05,
};

export const DASHBOARD_WARNA = ["Hijau", "Kuning", "Merah"] as const;
export type DashboardWarna = (typeof DASHBOARD_WARNA)[number];

// --- RiskRow ---

export const RiskRowSchema = z.object({
  akun: z.string(),
  nama: z.string(),
  dashboard: z.enum(DASHBOARD_WARNA),
  level: z.enum(LEVEL),
  skor: z.number(),
  divergen: z.boolean(),
  renewalHari: z.number().nullable(),
  nilaiTahunan: z.number(),
  rupiahBerisiko: z.number(),
  p: z.number(),
  sinyalTeratas: z.array(SinyalSchema).max(3),
});
export type RiskRow = z.infer<typeof RiskRowSchema>;

// --- Klaim & jawaban Tanya Graph (dasar validator sitasi, bukan dikerjakan sekarang) ---

export const KlaimSchema = z.object({
  teks: z.string(),
  bukti_ids: z.array(z.string()),
  kutipan: z.string().optional(),
});
export type Klaim = z.infer<typeof KlaimSchema>;

export const AskResponseSchema = z.object({
  jawaban: z.string(),
  klaim: z.array(KlaimSchema),
});
export type AskResponse = z.infer<typeof AskResponseSchema>;
