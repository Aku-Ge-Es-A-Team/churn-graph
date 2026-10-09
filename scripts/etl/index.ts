// ETL pipeline + reconciliation (F-01): `bun run etl`.
// Output: data/build/nodes.jsonl, data/build/edges.jsonl, data/build/quality-report.json.
//
// Data rows per file in data/raw (T01-01; header not counted):
//   crm_accounts 45 · crm_contacts 160 · contact_employment_history 217 · employees 10 · crm_deals 22
//   interactions.jsonl 350 · outlets 620 · product_usage_daily 226,300 · support_tickets 640
//   bugs 4 · releases 3 · features 8 · contracts_billing 40 · decision_log 30
// Skipped: feature_usage_monthly.csv (optional, noisy), decision_log.xlsx (duplicate of the CSV), README.md.
//
// Design decisions (Adrian, 2026-10-09): 14 files (13 required by Brief §3.1 + crm_deals); output shape =
// Technical Plan Step 3 (see types.ts), independent of src/types/graph.ts; CSV parsing with papaparse.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { UsageAggregator } from "./aggregate";
import { buildGraph, evidenceCoverage, type Dataset } from "./build";
import { deriveRelations, mergeGraphs } from "./derive";
import { extractCsv, extractJsonl } from "./extract";
import { buildEmailIndex, parseAlias } from "./resolve";
import * as S from "./schemas";
import { EtlError, type FileStats } from "./types";

const ROOT = resolve(import.meta.dir, "../..");
export const RAW_DEFAULT = join(ROOT, "data/raw");
export const BUILD_DEFAULT = join(ROOT, "data/build");
const ALIAS_DEFAULT = join(ROOT, "data/aliases.csv");

const FOCUS_ACCOUNTS = ["C01", "C02", "C03", "C04", "C05", "C06"];

export type EtlOptions = { rawDir?: string; outDir?: string; aliasFile?: string; snapshot?: string; write?: boolean };

function readRaw(rawDir: string, file: string): string {
  const path = join(rawDir, file);
  if (!existsSync(path)) throw new EtlError(`Required file is missing: ${path}`);
  return readFileSync(path, "utf8");
}

const jsonl = (rows: readonly unknown[]): string => rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");

export function runEtl(options: EtlOptions = {}) {
  const rawDir = options.rawDir ?? RAW_DEFAULT;
  const outDir = options.outDir ?? BUILD_DEFAULT;
  const snapshot = options.snapshot ?? process.env.SNAPSHOT_DATE ?? "2026-10-01";
  const aliasFile = options.aliasFile ?? ALIAS_DEFAULT;
  const stats: FileStats[] = [];

  const collect = <T>(): [T[], (r: T) => void] => {
    const arr: T[] = [];
    return [arr, (r) => void arr.push(r)];
  };

  // ---- Extract + validate (order matters: tickets before usage so the version on a ticket date can be recorded) ----
  const [accounts, onAccount] = collect<S.Row<typeof S.ACCOUNT>>();
  stats.push(extractCsv(S.ACCOUNT, readRaw(rawDir, S.ACCOUNT.file), onAccount));
  const [contacts, onContact] = collect<S.Row<typeof S.CONTACT>>();
  stats.push(extractCsv(S.CONTACT, readRaw(rawDir, S.CONTACT.file), onContact));
  const [history, onHistory] = collect<S.Row<typeof S.EMPLOYMENT_HISTORY>>();
  stats.push(extractCsv(S.EMPLOYMENT_HISTORY, readRaw(rawDir, S.EMPLOYMENT_HISTORY.file), onHistory));
  const [employees, onEmployee] = collect<S.Row<typeof S.EMPLOYEE>>();
  stats.push(extractCsv(S.EMPLOYEE, readRaw(rawDir, S.EMPLOYEE.file), onEmployee));
  const [deals, onDeal] = collect<S.Row<typeof S.DEAL>>();
  stats.push(extractCsv(S.DEAL, readRaw(rawDir, S.DEAL.file), onDeal));
  const [outlets, onOutlet] = collect<S.Row<typeof S.OUTLET>>();
  stats.push(extractCsv(S.OUTLET, readRaw(rawDir, S.OUTLET.file), onOutlet));
  const [tickets, onTicket] = collect<S.Row<typeof S.TICKET>>();
  stats.push(extractCsv(S.TICKET, readRaw(rawDir, S.TICKET.file), onTicket));
  const [bugs, onBug] = collect<S.Row<typeof S.BUG>>();
  stats.push(extractCsv(S.BUG, readRaw(rawDir, S.BUG.file), onBug));
  const [releases, onRelease] = collect<S.Row<typeof S.RELEASE>>();
  stats.push(extractCsv(S.RELEASE, readRaw(rawDir, S.RELEASE.file), onRelease));
  const [features, onFeature] = collect<S.Row<typeof S.FEATURE>>();
  stats.push(extractCsv(S.FEATURE, readRaw(rawDir, S.FEATURE.file), onFeature));
  const [contracts, onContract] = collect<S.Row<typeof S.CONTRACT>>();
  stats.push(extractCsv(S.CONTRACT, readRaw(rawDir, S.CONTRACT.file), onContract));
  const [decisions, onDecision] = collect<S.Row<typeof S.DECISION>>();
  stats.push(extractCsv(S.DECISION, readRaw(rawDir, S.DECISION.file), onDecision));
  const [interactions, onInteraction] = collect<S.Row<typeof S.INTERACTION>>();
  const interactionFile = existsSync(join(rawDir, "interactions.jsonl")) || !existsSync(join(rawDir, "interactions.json")) ? "interactions.jsonl" : "interactions.json";
  stats.push(extractJsonl({ ...S.INTERACTION, file: interactionFile }, readRaw(rawDir, interactionFile), onInteraction));

  const aggregator = new UsageAggregator(new Set(tickets.filter((t) => t.outlet_id).map((t) => `${t.outlet_id}|${t.dibuat}`)));
  stats.push(extractCsv(S.USAGE, readRaw(rawDir, S.USAGE.file), (r) => aggregator.add(r)));

  // ---- Email resolution, reconciliation, emit ----
  const aliases = existsSync(aliasFile) ? parseAlias(readFileSync(aliasFile, "utf8")) : [];
  const emailIndex = buildEmailIndex(contacts, employees, aliases);

  const data: Dataset = {
    accounts, contacts, history, employees, deals, outlets, tickets, bugs, releases, features, contracts, decisions, interactions,
    usage: aggregator.finish(),
    interactionFile,
    versionOnDate: aggregator.versionOnDate,
  };
  const base = buildGraph(data, { emailIndex, snapshot });
  const derived = deriveRelations(data, base);
  const { nodes, edges } = mergeGraphs(base, derived);

  const nodesByLabel: Record<string, number> = {};
  for (const n of nodes) nodesByLabel[n.label] = (nodesByLabel[n.label] ?? 0) + 1;
  const edgesByType: Record<string, number> = {};
  for (const e of edges) edgesByType[e.type] = (edgesByType[e.type] ?? 0) + 1;
  const sortKeys = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).sort(([x], [y]) => (x < y ? -1 : 1)));

  const report = {
    snapshot,
    files: stats,
    skipped_files: [
      { file: "feature_usage_monthly.csv", reason: "optional and noisy (Brief §3.3 #6)" },
      { file: "decision_log.xlsx", reason: "duplicate of decision_log.csv; values/dates are prone to mis-parsing (PRD §5)" },
    ],
    nodes_by_label: sortKeys(nodesByLabel),
    edges_by_type: sortKeys(edgesByType),
    node_count: nodes.length,
    edge_count: edges.length,
    derived_relations: derived.report,
    reconciliation: {
      rule: "contract values (contracts_billing.csv) win over CRM",
      account_contract_conflicts: base.account_contract_conflicts,
      deal_contract_differences: base.deal_contract_differences,
    },
    interaction_templates: base.interaction_templates,
    unresolved_emails: base.unresolved_emails,
    unknown_meeting_participants: base.unknown_meeting_participants,
    ticket_vs_usage_versions: base.ticket_vs_usage_versions,
    stale_crm_champions: base.stale_crm_champions,
    dropped_relations: [...base.dropped_relations, ...derived.dropped],
    evidence_path_coverage: evidenceCoverage(base.nodes, base.edges, FOCUS_ACCOUNTS),
  };

  if (options.write !== false) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "nodes.jsonl"), jsonl(nodes));
    writeFileSync(join(outDir, "edges.jsonl"), jsonl(edges));
    writeFileSync(join(outDir, "quality-report.json"), JSON.stringify(report, null, 2) + "\n");
  }
  return { nodes, edges, report, data, base };
}

if (import.meta.main) {
  try {
    const t0 = performance.now();
    const { report } = runEtl();
    const summarize = (o: Record<string, number>) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join(" ");
    console.log("ETL finished in", Math.round(performance.now() - t0), "ms ->", dirname(join(BUILD_DEFAULT, "x")));
    for (const s of report.files) console.log(`  ${s.file.padEnd(32)} rows ${String(s.rows).padStart(6)} = passed ${String(s.passed).padStart(6)} + failed ${s.failed}`);
    console.log("nodes    :", report.node_count, "|", summarize(report.nodes_by_label));
    console.log("relations:", report.edge_count, "|", summarize(report.edges_by_type));
    console.log(`templates: ${report.interaction_templates.count}/${report.interaction_templates.total} | unresolved emails: ${report.unresolved_emails.length} | dropped relations: ${report.dropped_relations.length}`);
  } catch (e) {
    console.error(e instanceof EtlError ? `ETL STOPPED: ${e.message}` : e);
    process.exit(1);
  }
}
