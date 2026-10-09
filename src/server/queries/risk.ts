// Ranking data (F-05): reads customer accounts and rule-engine signals from the graph and builds RiskRow[].
// The Cypher below uses the graph vocabulary (Akun, Sinyal, Kontrak, ...) as stored in Aura; everything
// returned to the application is translated to the English contract in src/types/graph.ts.
import { DASHBOARD_COLORS, FOCUS_ACCOUNT_IDS, SignalSchema, type DashboardColor, type RiskRow, type Signal } from "../../types/graph";
import { DEFAULT_CONFIG, DEFAULT_REFERENCE_DATE } from "../scoring/config";
import { buildRiskRows, ignoredSignals, type AccountInfo } from "../scoring/rank";
import type { CypherRunner } from "./runner";

const FOCUS_SET: ReadonlySet<string> = new Set(FOCUS_ACCOUNT_IDS);
const DASHBOARD_FROM_DATA: Record<string, DashboardColor> = { Hijau: "Green", Kuning: "Yellow", Merah: "Red" };

/** Translates the dashboard colour stored in the CRM data. Unknown values violate the data contract. */
export function parseDashboard(raw: unknown): DashboardColor {
  const text = typeof raw === "string" ? raw.trim() : "";
  const mapped = DASHBOARD_FROM_DATA[text] ?? (DASHBOARD_COLORS as readonly string[]).find((c) => c.toLowerCase() === text.toLowerCase());
  if (!mapped) throw new Error(`Unexpected dashboard health score: ${JSON.stringify(raw)}`);
  return mapped as DashboardColor;
}

/** Reference date for "days to renewal": SNAPSHOT_DATE (default 2026-10-01), parsed as UTC midnight. */
export function referenceDate(env: Record<string, string | undefined> = process.env): Date {
  const configured = env.SNAPSHOT_DATE?.trim();
  const date = new Date(`${configured || DEFAULT_REFERENCE_DATE}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? new Date(`${DEFAULT_REFERENCE_DATE}T00:00:00Z`) : date;
}

/** The 40 customer accounts (prospects P01–P05 are excluded). */
export async function fetchAccounts(run: CypherRunner): Promise<AccountInfo[]> {
  const rows = await run(
    `MATCH (a:Akun {tipe: 'pelanggan'})
     OPTIONAL MATCH (a)-[:MEMILIKI]->(k:Kontrak)
     RETURN a.id AS account, a.nama AS name, a.health_score_dashboard AS dashboard,
            k.nilai_tahunan AS annualValue, k.tanggal_renewal AS renewalDate
     ORDER BY account`,
  );
  return rows.map((r) => ({
    account: String(r.account),
    name: String(r.name),
    dashboard: parseDashboard(r.dashboard),
    annualValue: typeof r.annualValue === "number" ? r.annualValue : 0,
    renewalDate: typeof r.renewalDate === "string" ? r.renewalDate : null,
  }));
}

function parseFacts(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Signals written by the rule engine; one account when `account` is given, otherwise all. */
export async function fetchSignals(run: CypherRunner, account?: string): Promise<Signal[]> {
  const rows = await run(
    `MATCH (s:Sinyal)-[:PADA]->(a:Akun)
     WHERE $account IS NULL OR a.id = $account
     OPTIONAL MATCH (s)-[:BUKTI]->(x:Entitas)
     WITH s, a, collect(x.id) AS evidenceIds
     RETURN a.id AS account, s.kode AS code, s.bobot AS weight, s.sejak AS since, s.fakta AS facts, evidenceIds
     ORDER BY account, code, since`,
    { account: account ?? null },
  );
  const signals: Signal[] = [];
  for (const r of rows) {
    const parsed = SignalSchema.safeParse({ ...r, facts: parseFacts(r.facts) });
    if (parsed.success) signals.push(parsed.data);
    else console.warn(`[risk] signal skipped, violates the contract: ${parsed.error.issues[0]?.message ?? "invalid"}`);
  }
  return signals;
}

/** Ranked RiskRow[] (score desc → nearest renewal → largest value → id). `focus` keeps only C01–C06. */
export async function fetchRanking(run: CypherRunner, options: { focus?: boolean; asOf?: Date } = {}): Promise<RiskRow[]> {
  const [accounts, signals] = await Promise.all([fetchAccounts(run), fetchSignals(run)]);
  const ignored = ignoredSignals(accounts, signals);
  if (ignored.unknownAccount.length || ignored.invalidWeight.length) {
    console.warn(`[risk] ignored signals: ${ignored.unknownAccount.length} for non-customer accounts, ${ignored.invalidWeight.length} with an invalid weight`);
  }
  const rows = buildRiskRows(accounts, signals, options.asOf ?? referenceDate(), DEFAULT_CONFIG);
  return options.focus ? rows.filter((r) => FOCUS_SET.has(r.account)) : rows;
}
