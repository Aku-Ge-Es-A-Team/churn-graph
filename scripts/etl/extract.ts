// Extract stage (T01-02): read CSV/JSONL row by row, validate with zod, record failed rows with their reason.
// Invariant: rows = passed + failed (no row disappears without a reason).
import Papa from "papaparse";
import type { z } from "zod";
import type { Definition } from "./schemas";
import { EtlError, type Failure, type FileStats } from "./types";

const MAX_EXAMPLES = 20;

const stripBom = (t: string): string => (t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);

function recorder(file: string) {
  const stats: FileStats = { file, rows: 0, passed: 0, failed: 0, failure_examples: [] };
  return {
    stats,
    fail(row: number, id: string | null, reason: string) {
      stats.failed++;
      if (stats.failure_examples.length < MAX_EXAMPLES) stats.failure_examples.push({ row, id, reason } satisfies Failure);
    },
  };
}

function zodReason(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.length ? i.path.join(".") : "(row)"}: ${i.message}`).join("; ");
}

function finish(stats: FileStats): FileStats {
  if (stats.rows !== stats.passed + stats.failed) {
    throw new EtlError(`${stats.file}: rows (${stats.rows}) != passed (${stats.passed}) + failed (${stats.failed})`);
  }
  return stats;
}

/** CSV → validated rows via `onRow`. Row number = line number in the file (header = 1). */
export function extractCsv<S extends z.ZodType>(
  def: Definition<S>,
  text: string,
  onRow: (row: z.output<S>, rowNumber: number) => void,
): FileStats {
  const { stats, fail } = recorder(def.file);
  let rowNumber = 1;
  let headerChecked = false;

  Papa.parse<Record<string, string>>(stripBom(text), {
    header: true,
    delimiter: ",",
    skipEmptyLines: true,
    dynamicTyping: false,
    step: (result) => {
      if (!headerChecked) {
        headerChecked = true;
        const present = result.meta.fields ?? [];
        const missing = def.columns.filter((c) => !present.includes(c));
        if (missing.length > 0) throw new EtlError(`${def.file}: missing columns: ${missing.join(", ")}`);
      }
      rowNumber++;
      stats.rows++;
      const id = result.data[def.columns[0]] ?? null;
      if (result.errors.length > 0) {
        fail(rowNumber, id, result.errors.map((e) => e.message).join("; "));
        return;
      }
      const parsed = def.schema.safeParse(result.data);
      if (!parsed.success) {
        fail(rowNumber, id, zodReason(parsed.error));
        return;
      }
      stats.passed++;
      onRow(parsed.data as z.output<S>, rowNumber);
    },
  });

  if (!headerChecked) throw new EtlError(`${def.file}: file is empty or has no data rows`);
  return finish(stats);
}

/** JSON Lines (one object per line) → validated rows. */
export function extractJsonl<S extends z.ZodType>(
  def: Definition<S>,
  text: string,
  onRow: (row: z.output<S>, rowNumber: number) => void,
): FileStats {
  const { stats, fail } = recorder(def.file);
  const lines = stripBom(text).split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.trim() === "") return;
    const rowNumber = i + 1;
    stats.rows++;
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch (e) {
      fail(rowNumber, null, `Invalid JSON: ${(e as Error).message}`);
      return;
    }
    const id = typeof raw === "object" && raw !== null ? String((raw as Record<string, unknown>)[def.columns[0]] ?? "") || null : null;
    const parsed = def.schema.safeParse(raw);
    if (!parsed.success) {
      fail(rowNumber, id, zodReason(parsed.error));
      return;
    }
    stats.passed++;
    onRow(parsed.data as z.output<S>, rowNumber);
  });
  if (stats.rows === 0) throw new EtlError(`${def.file}: file is empty or has no data rows`);
  return finish(stats);
}
