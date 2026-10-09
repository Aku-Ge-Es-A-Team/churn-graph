// Manual validation helper for F-02..F-04 (read-only): show signals per account and the evidence path from the Aura graph.
//   bun scripts/demo-radar.ts                  → preview of accounts ordered by total signal weight
//   bun scripts/demo-radar.ts --account C01    → that account's signals + evidence path (relations among the evidence nodes, with their source files)
// NOTE: "preview ordering" = sum of F-04 signal weights only. The official score/level/rupiah value is F-05 (Dio); retention actions are F-09.
// The Cypher below is unchanged: its result aliases and property names are graph vocabulary.
import type { Driver } from "neo4j-driver";
import { toPlainValue } from "../src/server/neo4j-values";
import { ConfigError, createDriver, neo4j } from "./lib/neo4j";

type Row = Record<string, unknown>;

async function queryRows(driver: Driver, cypher: string, params: Record<string, unknown> = {}): Promise<Row[]> {
  const s = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    return (await s.run(cypher, params)).records.map((r) => toPlainValue(r.toObject()) as Row);
  } finally {
    await s.close();
  }
}

const formatIdr = (n: unknown) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n));

async function preview(driver: Driver) {
  const rows = await queryRows(
    driver,
    `MATCH (a:Akun {tipe: 'pelanggan'})
     OPTIONAL MATCH (s:Sinyal)-[:PADA]->(a)
     OPTIONAL MATCH (a)-[:MEMILIKI]->(k:Kontrak)
     WITH a, k, s ORDER BY s.bobot DESC, s.kode
     WITH a, k, collect(s) AS sinyal
     RETURN a.id AS akun, a.nama AS nama, a.health_score_dashboard AS dashboard,
            reduce(t = 0, x IN sinyal | t + x.bobot) AS skor, [x IN sinyal | x.kode] AS kode,
            toString(k.tanggal_renewal) AS renewal, k.nilai_tahunan AS nilai
     ORDER BY skor DESC, akun`,
  );
  const withSignals = rows.filter((b) => Number(b.skor) > 0);
  console.log(`Preview (sum of F-04 signal weights; the official score is F-05) -- ${withSignals.length} of ${rows.length} customers have signals\n`);
  console.log("account score dashboard renewal     annual value   name / signals");
  for (const b of withSignals) {
    console.log(`${String(b.akun).padEnd(7)} ${String(b.skor).padStart(4)}  ${String(b.dashboard ?? "-").padEnd(9)}  ${String(b.renewal).padEnd(10)}  ${formatIdr(b.nilai).padStart(14)}   ${b.nama}`);
    console.log(`${" ".repeat(55)}${(b.kode as string[]).join(", ")}`);
  }
  const withoutSignals = rows.filter((b) => Number(b.skor) === 0).map((b) => b.akun);
  console.log(`\nWithout signals (${withoutSignals.length}): ${withoutSignals.join(" ")}`);
}

async function detail(driver: Driver, account: string) {
  const [a] = await queryRows(driver, "MATCH (a:Akun {id: $id}) RETURN a.nama AS nama, a.tipe AS tipe, a.health_score_dashboard AS dashboard, a.champion_contact_id AS champion", { id: account });
  if (!a) {
    console.error(`Account '${account}' does not exist in the graph.`);
    process.exitCode = 1;
    return;
  }
  console.log(`${account} · ${a.nama} · ${a.tipe} · dashboard ${a.dashboard ?? "-"} · CRM champion ${a.champion ?? "-"}\n`);
  const signals = await queryRows(
    driver,
    `MATCH (s:Sinyal)-[:PADA]->(:Akun {id: $id})
     OPTIONAL MATCH (s)-[:BUKTI]->(x:Entitas)
     WITH s, collect(x.id) AS bukti ORDER BY s.bobot DESC, s.kode
     RETURN s.id AS id, s.kode AS kode, s.bobot AS bobot, s.sejak AS sejak, s.fakta AS fakta, s.source_file AS aturan, bukti`,
    { id: account },
  );
  if (signals.length === 0) console.log("No signals (the account is consistent according to the 8 v1 rules).");
  for (const s of signals) {
    console.log(`▸ ${s.kode}  weight ${s.bobot}  since ${s.sejak}  [${s.aturan}]`);
    console.log(`  facts   : ${s.fakta}`);
    const ids = s.bukti as string[];
    const relations = await queryRows(
      driver,
      `MATCH (x:Entitas)-[r]->(y:Entitas) WHERE x.id IN $ids AND y.id IN $ids AND NOT type(r) IN ['BUKTI','PADA']
       RETURN x.id AS dari, labels(x)[1] AS ldari, type(r) AS tipe, y.id AS ke, labels(y)[1] AS lke, r.source_file AS berkas, r.derived AS turunan
       ORDER BY tipe, dari, ke`,
      { ids },
    );
    console.log(`  evidence: ${ids.length} nodes, ${relations.length} relations among them`);
    for (const r of relations) console.log(`    (${r.dari}:${r.ldari})-[:${r.tipe}${r.turunan ? " derived" : ""}]->(${r.ke}:${r.lke})   ← ${r.berkas}`);
    console.log();
  }
}

if (import.meta.main) {
  const i = process.argv.indexOf("--account");
  const account = i >= 0 ? process.argv[i + 1] : undefined;
  let driver: Driver;
  try {
    driver = createDriver();
  } catch (e) {
    console.error(e instanceof ConfigError ? `ABORTED: ${e.message}` : e);
    process.exit(1);
  }
  (account ? detail(driver, account) : preview(driver))
    .catch((e) => {
      console.error(`FAILED: ${e instanceof Error ? e.message : e}`);
      process.exitCode = 1;
    })
    .finally(() => driver.close());
}
