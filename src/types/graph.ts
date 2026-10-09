// Kontrak data bersama BE <-> FE (Rencana Teknis Langkah 3).
// Satu-satunya perbedaan dari Rencana: RiskRow.level mengikuti PRD
// (Kritis/Tinggi/Waspada/Aman), bukan Kritis/Tinggi/Sedang/Rendah -- konflik K-B.

export type Sumber = "crm" | "interaksi" | "usage" | "tiket" | "kontrak" | "keputusan" | "turunan";

export type GNode = { key: string; id: string; label: string; sumber: Sumber; props: Record<string, unknown> };
export type GEdge = { key: string; type: string; from: string; to: string; derived: boolean; props: Record<string, unknown> };
export type GraphPayload = { nodes: GNode[]; edges: GEdge[]; highlight: string[] };

export type RiskRow = {
  id: string;
  nama: string;
  dashboard: string; // health_score_dashboard apa adanya
  level: "Kritis" | "Tinggi" | "Waspada" | "Aman";
  skor: number;
  renewal: string; // ISO date
  hariKeRenewal: number;
  nilaiTahunan: number;
  nilaiBerisiko: number; // Estimasi
  sinyal: { kode: string; bobot: number }[];
};
