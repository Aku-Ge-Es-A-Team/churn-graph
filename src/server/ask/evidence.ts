import { z } from "zod";
import type { GraphPayload } from "../../types/graph";

// Contract of a Q&A tool result (the tools themselves are built later):
//   { data: unknown, evidence: EvidenceItem[] }
// `evidence` holds ALL nodes/edges the tool query actually returned. The citation validator only trusts
// IDs that entered the registry this way, never IDs the LLM mentions from memory.

export const EvidenceItemSchema = z.object({
  id: z.string().min(1),
  source_file: z.string().min(1),
  source_id: z.string().min(1),
  text: z.string().optional(),
  // Beyond the minimal contract: used by the number check (rule 4), not by the quote check.
  props: z.record(z.string(), z.unknown()).optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

// Property keys treated as "source text" for the quote check. These are graph property names
// (dataset vocabulary: isi = body, judul = title, deskripsi = description, ...); extend when the schema grows.
export const TEXT_PROP_KEYS = ["text", "isi", "judul", "deskripsi", "keputusan", "alasan", "subjek"];

export class EvidenceRegistry {
  private items = new Map<string, EvidenceItem>();

  add(input: EvidenceItem | EvidenceItem[]): void {
    for (const item of Array.isArray(input) ? input : [input]) {
      if (!item?.id) continue;
      const previous = this.items.get(item.id);
      if (!previous) {
        this.items.set(item.id, { ...item });
        continue;
      }
      // Safe merge: existing values are not overwritten by empty ones; the first value wins when both are set.
      this.items.set(item.id, {
        id: previous.id,
        source_file: previous.source_file || item.source_file,
        source_id: previous.source_id || item.source_id,
        text: previous.text || item.text,
        props: previous.props ?? item.props,
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
  const parts = TEXT_PROP_KEYS.map((k) => props[k]).filter((v): v is string => typeof v === "string" && v.trim() !== "");
  return parts.length ? parts.join("\n") : undefined;
}

export function evidenceFromGraphPayload(payload: GraphPayload): EvidenceItem[] {
  return [...payload.nodes, ...payload.edges].map((x) => ({
    id: x.id,
    source_file: x.source_file,
    source_id: x.source_id,
    text: textFromProps(x.props),
    props: x.props,
  }));
}

// Defensive: oddly shaped tool results or incomplete evidence items are silently skipped.
// Returns the number of accepted items.
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
