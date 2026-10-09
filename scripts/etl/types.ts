// ETL output contract (F-01). Deliberately standalone: it does NOT import `src/types/graph.ts`
// (Adrian's decision 2026-10-09: the ETL output shape follows Technical Plan Step 3, not Dio's draft contract).
// One JSON record per line in `data/build/nodes.jsonl` and `data/build/edges.jsonl`.

/** Persisted in the graph as the `sumber` property; the values are dataset vocabulary and must not be translated. */
export type Source = "crm" | "interaksi" | "usage" | "tiket" | "kontrak" | "keputusan" | "turunan";

export type EtlNode = {
  /** Same as `id` (globally unique string ID, e.g. "C01", "v4.12"). */
  key: string;
  id: string;
  /** Primary label; the loader (F-02) adds the secondary label `:Entitas`. */
  label: string;
  sumber: Source;
  source_file: string;
  source_id: string;
  props: Record<string, unknown>;
};

export type EtlEdge = {
  /** `${type}:${from}->${to}` (+ a discriminator for relations that can repeat). */
  key: string;
  type: string;
  from: string;
  to: string;
  derived: boolean;
  source_file: string;
  source_id: string;
  props: Record<string, unknown>;
};

/** Error that stops the ETL (missing file, missing column, duplicate ID, ...). */
export class EtlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EtlError";
  }
}

export type Failure = { row: number; id: string | null; reason: string };

export type FileStats = {
  file: string;
  /** Number of data rows in the file (header excluded). Always = passed + failed. */
  rows: number;
  passed: number;
  failed: number;
  /** At most 20 examples; the total count is in `failed`. */
  failure_examples: Failure[];
};
