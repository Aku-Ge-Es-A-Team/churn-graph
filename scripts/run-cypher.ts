// Cypher runner (F-03, T03-04): run every *.cypher file in a folder, in name order.
//   bun scripts/run-cypher.ts cypher/derive
// Parameter: $snapshot = SNAPSHOT_DATE (default 2026-10-01). The folder and file contents come from the repo, not from user input.
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Driver } from "neo4j-driver";
import { ConfigError, createDriver, neo4j, splitStatements } from "./lib/neo4j";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export type FileResult = { file: string; statements: number; relationsCreated: number; relationsDeleted: number; nodesCreated: number; propertiesSet: number };

export function defaultSnapshot(): string {
  return process.env.SNAPSHOT_DATE?.trim() || "2026-10-01";
}

export function listFiles(folder: string): string[] {
  return readdirSync(folder)
    .filter((f) => f.endsWith(".cypher"))
    .sort()
    .map((f) => join(folder, f));
}

export async function runFolder(driver: Driver, folder: string, params: Record<string, unknown> = { snapshot: defaultSnapshot() }): Promise<FileResult[]> {
  const results: FileResult[] = [];
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    for (const file of listFiles(folder)) {
      const r: FileResult = { file: basename(file), statements: 0, relationsCreated: 0, relationsDeleted: 0, nodesCreated: 0, propertiesSet: 0 };
      for (const statement of splitStatements(readFileSync(file, "utf8"))) {
        const res = await session.executeWrite((tx) => tx.run(statement, params));
        const c = res.summary.counters.updates();
        r.statements++;
        r.relationsCreated += c.relationshipsCreated;
        r.relationsDeleted += c.relationshipsDeleted;
        r.nodesCreated += c.nodesCreated;
        r.propertiesSet += c.propertiesSet;
      }
      results.push(r);
    }
  } finally {
    await session.close();
  }
  return results;
}

if (import.meta.main) {
  const folderArg = process.argv[2];
  if (!folderArg) {
    console.error("Usage: bun scripts/run-cypher.ts <folder>   e.g. cypher/derive");
    process.exit(2);
  }
  const driver = (() => {
    try {
      return createDriver();
    } catch (e) {
      console.error(e instanceof ConfigError ? `ABORTED: ${e.message}` : e);
      process.exit(1);
    }
  })();
  runFolder(driver, resolve(ROOT, folderArg))
    .then((results) => {
      for (const h of results) console.log(`${h.file}: ${h.statements} statements | relations +${h.relationsCreated} -${h.relationsDeleted} | nodes +${h.nodesCreated} | properties ${h.propertiesSet}`);
    })
    .catch((e) => {
      console.error(`RUN-CYPHER FAILED: ${e instanceof Error ? e.message : e}`);
      process.exitCode = 1;
    })
    .finally(() => driver.close());
}
