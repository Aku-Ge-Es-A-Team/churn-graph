// Signal rule runner (F-04, T04-02): one cypher/signals/*.cypher file = one rule (one statement).
//   bun scripts/signals.ts
// Every result row must follow the contract {akun, kode, bobot, bukti_ids, fakta, sejak}; a violation stops the runner
// BEFORE anything is written. Result: (:Sinyal)-[:PADA]->(:Akun) and (:Sinyal)-[:BUKTI]->(:Entitas).
// The runner only deletes its own Sinyal nodes (source_file starting with 'cypher/signals/'), not signals from other features (e.g. F-17).
// The contract field names are the Cypher result aliases and the persisted Sinyal properties, so they stay as they are.
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Driver } from "neo4j-driver";
import { z } from "zod";
import { toIsoDate, toPlainValue } from "../src/server/neo4j-values";
import { defaultSnapshot } from "./run-cypher";
import { ConfigError, createDriver, neo4j, splitStatements } from "./lib/neo4j";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SIGNALS_FOLDER = join(ROOT, "cypher/signals");
const SOURCE_PREFIX = "cypher/signals/";
const BATCH = 100;

export class SignalContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignalContractError";
  }
}

export type Signal = { id: string; akun: string; kode: string; bobot: number; bukti_ids: string[]; fakta: Record<string, unknown>; sejak: string; source_file: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const RowSchema = z.object({
  akun: z.string().min(1),
  kode: z.string().regex(/^[A-Z][A-Z0-9_]*$/, "kode must be uppercase letters/digits/underscore"),
  bobot: z.number(),
  bukti_ids: z.array(z.string().min(1)).min(1),
  fakta: z.union([z.record(z.string(), z.unknown()), z.string()]),
  sejak: z.string().regex(ISO, "sejak must be a YYYY-MM-DD date"),
});

/** Validate one rule result row against the contract. Throws SignalContractError with the file name. */
export function validateRow(file: string, row: Record<string, unknown>): Omit<Signal, "id" | "source_file"> {
  const requiredColumns = ["akun", "kode", "bobot", "bukti_ids", "fakta", "sejak"];
  const missing = requiredColumns.filter((k) => !(k in row));
  if (missing.length > 0) throw new SignalContractError(`${file}: missing result columns: ${missing.join(", ")}`);
  const raw = { ...row, bobot: Number(toPlainValue(row.bobot)), fakta: toPlainValue(row.fakta), bukti_ids: toPlainValue(row.bukti_ids), sejak: toIsoDate(row.sejak) ?? String(row.sejak) };
  const p = RowSchema.safeParse(raw);
  if (!p.success) throw new SignalContractError(`${file}: ${p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const d = p.data;
  if (!d.bukti_ids.includes(d.akun)) throw new SignalContractError(`${file}: bukti_ids must contain the account (${d.akun})`);
  const fileCode = basename(file, ".cypher").toUpperCase();
  if (d.kode !== fileCode) throw new SignalContractError(`${file}: kode '${d.kode}' does not match the file name (${fileCode})`);
  const fakta = typeof d.fakta === "string" ? (JSON.parse(d.fakta) as Record<string, unknown>) : d.fakta;
  return { akun: d.akun, kode: d.kode, bobot: d.bobot, bukti_ids: [...new Set(d.bukti_ids)], fakta, sejak: d.sejak };
}

export async function runRules(driver: Driver, folder: string, snapshot: string): Promise<Signal[]> {
  const files = readdirSync(folder).filter((f) => f.endsWith(".cypher")).sort();
  if (files.length === 0) throw new SignalContractError(`${folder}: no rule files *.cypher`);
  const results: Signal[] = [];
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    for (const f of files) {
      const statements = splitStatements(readFileSync(join(folder, f), "utf8"));
      if (statements.length !== 1) throw new SignalContractError(`${f}: one file = one rule (one statement), found ${statements.length}`);
      const res = await session.executeRead((tx) => tx.run(statements[0], { snapshot }));
      const rows = res.records.map((r) => validateRow(f, r.toObject()));
      rows.sort((a, b) => (a.akun < b.akun ? -1 : a.akun > b.akun ? 1 : a.sejak < b.sejak ? -1 : a.sejak > b.sejak ? 1 : a.bukti_ids.join() < b.bukti_ids.join() ? -1 : 1));
      const sequence = new Map<string, number>();
      for (const b of rows) {
        const k = `${b.akun}|${b.kode}`;
        const n = (sequence.get(k) ?? 0) + 1;
        sequence.set(k, n);
        results.push({ ...b, id: `SIG-${b.akun}-${b.kode}-${n}`, source_file: `${SOURCE_PREFIX}${f}` });
      }
    }
    // Every evidence ID must exist in the graph.
    const allIds = [...new Set(results.flatMap((s) => s.bukti_ids))];
    const found = await session.executeRead((tx) => tx.run("MATCH (n:Entitas) WHERE n.id IN $ids RETURN n.id AS id", { ids: allIds }));
    const foundSet = new Set(found.records.map((r) => r.get("id") as string));
    const missingIds = allIds.filter((id) => !foundSet.has(id));
    if (missingIds.length > 0) {
      const example = results.find((s) => s.bukti_ids.some((id) => !foundSet.has(id)))!;
      throw new SignalContractError(`${example.source_file}: bukti_ids contains IDs that do not exist in the graph: ${missingIds.slice(0, 5).join(", ")}${missingIds.length > 5 ? ` (+${missingIds.length - 5})` : ""}`);
    }
  } finally {
    await session.close();
  }
  return results;
}

export async function writeSignals(driver: Driver, signals: readonly Signal[]): Promise<void> {
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await session.executeWrite((tx) => tx.run("MATCH (s:Sinyal) WHERE s.source_file STARTS WITH $awalan DETACH DELETE s", { awalan: SOURCE_PREFIX }));
    const cypher = `UNWIND $rows AS r
MATCH (a:Akun {id: r.akun})
CREATE (s:Entitas:Sinyal {id: r.id})
SET s.kode = r.kode, s.bobot = r.bobot, s.sejak = date(r.sejak), s.fakta = r.fakta,
    s.sumber = 'turunan', s.source_file = r.source_file, s.source_id = r.id
MERGE (s)-[p:PADA {key: 'PADA:' + r.id + '->' + a.id}]->(a)
SET p.derived = true, p.source_file = r.source_file, p.source_id = r.id
WITH s, r
UNWIND r.bukti_ids AS bid
MATCH (x:Entitas {id: bid})
MERGE (s)-[b:BUKTI {key: 'BUKTI:' + r.id + '->' + bid}]->(x)
SET b.derived = true, b.source_file = r.source_file, b.source_id = r.id`;
    for (let i = 0; i < signals.length; i += BATCH) {
      const rows = signals.slice(i, i + BATCH).map((s) => ({
        id: s.id, akun: s.akun, kode: s.kode, bobot: s.bobot, sejak: s.sejak,
        fakta: JSON.stringify(s.fakta), // Neo4j properties cannot be maps → JSON string
        source_file: s.source_file, bukti_ids: s.bukti_ids,
      }));
      await session.executeWrite((tx) => tx.run(cypher, { rows }));
    }
  } finally {
    await session.close();
  }
}

export async function runSignals(driver: Driver, options: { folder?: string; snapshot?: string } = {}): Promise<Signal[]> {
  const signals = await runRules(driver, options.folder ?? SIGNALS_FOLDER, options.snapshot ?? defaultSnapshot());
  await writeSignals(driver, signals);
  return signals;
}

if (import.meta.main) {
  let driver: Driver;
  try {
    driver = createDriver();
  } catch (e) {
    console.error(e instanceof ConfigError ? `ABORTED: ${e.message}` : e);
    process.exit(1);
  }
  runSignals(driver)
    .then((s) => {
      const perCode: Record<string, number> = {};
      for (const x of s) perCode[x.kode] = (perCode[x.kode] ?? 0) + 1;
      console.log(`signals written: ${s.length} | snapshot ${defaultSnapshot()}`);
      for (const [k, n] of Object.entries(perCode).sort()) console.log(`  ${k.padEnd(26)} ${n}`);
    })
    .catch((e) => {
      console.error(`SIGNALS FAILED: ${e instanceof Error ? `${e.name}: ${e.message}` : e}`);
      process.exitCode = 1;
    })
    .finally(() => driver.close());
}
