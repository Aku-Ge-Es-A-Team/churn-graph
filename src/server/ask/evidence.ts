import { z } from "zod";
import type { GraphPayload } from "../../types/graph";

// Kontrak hasil tool Tanya Graph (tool-nya dibuat nanti):
//   { data: unknown, evidence: EvidenceItem[] }
// `evidence` berisi SEMUA node/edge yang benar-benar dikembalikan query tool itu.
// Validator sitasi hanya memercayai ID yang masuk registry lewat jalur ini,
// bukan ID yang disebut LLM dari ingatan.

export const EvidenceItemSchema = z.object({
  id: z.string().min(1),
  source_file: z.string().min(1),
  source_id: z.string().min(1),
  teks: z.string().optional(),
  // Tambahan di luar kontrak minimal: dipakai pemeriksaan angka (aturan 4), bukan kutipan.
  props: z.record(z.string(), z.unknown()).optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

// Kunci props yang dianggap "teks sumber" untuk pemeriksaan kutipan. Skema label milik
// Adrian dan belum final, jadi ubah daftar ini bila nama propertinya berbeda.
export const TEXT_PROP_KEYS = ["teks", "isi", "judul", "deskripsi", "keputusan", "alasan"];

export class EvidenceRegistry {
  private items = new Map<string, EvidenceItem>();

  add(input: EvidenceItem | EvidenceItem[]): void {
    for (const item of Array.isArray(input) ? input : [input]) {
      if (!item?.id) continue;
      const prev = this.items.get(item.id);
      if (!prev) {
        this.items.set(item.id, { ...item });
        continue;
      }
      // Gabung aman: nilai yang sudah ada tidak ditimpa nilai kosong; yang pertama menang bila keduanya terisi.
      this.items.set(item.id, {
        id: prev.id,
        source_file: prev.source_file || item.source_file,
        source_id: prev.source_id || item.source_id,
        teks: prev.teks || item.teks,
        props: prev.props ?? item.props,
      });
    }
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  get(id: string): EvidenceItem | undefined {
    return this.items.get(id);
  }

  get size(): number {
    return this.items.size;
  }

  ids(): string[] {
    return [...this.items.keys()];
  }
}

function textFromProps(props: Record<string, unknown>): string | undefined {
  const parts = TEXT_PROP_KEYS.map((k) => props[k]).filter(
    (v): v is string => typeof v === "string" && v.trim() !== "",
  );
  return parts.length ? parts.join("\n") : undefined;
}

export function evidenceFromGraphPayload(payload: GraphPayload): EvidenceItem[] {
  return [...payload.nodes, ...payload.edges].map((x) => ({
    id: x.id,
    source_file: x.source_file,
    source_id: x.source_id,
    teks: textFromProps(x.props),
    props: x.props,
  }));
}

// Defensif: hasil tool berbentuk aneh atau item bukti yang tidak lengkap diabaikan diam-diam.
// Mengembalikan jumlah item yang diterima.
export function collectEvidence(toolResults: unknown, registry: EvidenceRegistry): number {
  if (!Array.isArray(toolResults)) return 0;
  let accepted = 0;
  for (const result of toolResults) {
    const evidence = (result as { evidence?: unknown } | null)?.evidence;
    if (!Array.isArray(evidence)) continue;
    for (const raw of evidence) {
      const parsed = EvidenceItemSchema.safeParse(raw);
      if (!parsed.success) continue;
      registry.add(parsed.data);
      accepted++;
    }
  }
  return accepted;
}
