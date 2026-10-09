// F-18 (T17-01/T17-02): monthly usage of the outlets whose usage drop coincides with a release, versus a control group of
// offline outlets that never ran that release. Read-only; the source is `UsageBulan` (monthly aggregate), never daily rows.
// Graph vocabulary per scripts/etl: (Akun)-[:MEMILIKI]->(Outlet {mode_offline})-[:MENCATAT]->(UsageBulan {bulan,
// rata_harian_transaksi, rata_harian_offline}); (Outlet)-[:MENGALAMI]->(Anomali)-[:BERTEPATAN_DENGAN]->(Rilis {versi, tanggal_rilis});
// (Outlet)-[:MENJALANKAN_VERSI]->(Rilis).
import type { CypherRunner } from "./runner";

export type UsageMetrics = {
  /** Average transactions per day per outlet in the group (UsageBulan.rata_harian_transaksi). */
  transactions: number | null;
  /** Average offline transactions synced per day per outlet; null when no outlet in the group reported it that month. */
  offlineSynced: number | null;
};

export type UsagePoint = { month: string; affected: UsageMetrics; control: UsageMetrics };

export type UsageComparison = {
  account: string;
  release: { id: string; version: string; date: string };
  affectedCount: number;
  controlCount: number;
  points: UsagePoint[];
};

const USAGE_QUERY = `
MATCH (a:Akun {id: $account})-[:MEMILIKI]->(o:Outlet)-[:MENGALAMI]->(:Anomali)-[:BERTEPATAN_DENGAN]->(r:Rilis)
WITH r, collect(DISTINCT o) AS affected
ORDER BY size(affected) DESC, r.tanggal_rilis DESC
LIMIT 1
MATCH (c:Outlet {mode_offline: true})
WHERE NOT (c)-[:MENJALANKAN_VERSI]->(r)
WITH r, affected, collect(c) AS control
UNWIND [x IN affected | [x, 'affected']] + [x IN control | [x, 'control']] AS pair
WITH r, size(affected) AS affectedCount, size(control) AS controlCount, pair[0] AS o, pair[1] AS grp
MATCH (o)-[:MENCATAT]->(u:UsageBulan)
RETURN r.id AS releaseId, r.versi AS version, r.tanggal_rilis AS releaseDate, affectedCount, controlCount, grp,
       u.bulan AS month, avg(u.rata_harian_transaksi) AS transactions, avg(u.rata_harian_offline) AS offlineSynced
ORDER BY month, grp`;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
const EMPTY: UsageMetrics = { transactions: null, offlineSynced: null };

/** Shapes the query rows into one point per month (sorted), keeping nulls as gaps. No rows → null (no anomaly). */
export function buildUsageComparison(account: string, rows: Record<string, unknown>[]): UsageComparison | null {
  if (rows.length === 0) return null;
  const first = rows[0];
  const byMonth = new Map<string, UsagePoint>();
  for (const r of rows) {
    const month = String(r.month).slice(0, 7);
    const point = byMonth.get(month) ?? { month, affected: EMPTY, control: EMPTY };
    const metrics: UsageMetrics = { transactions: num(r.transactions), offlineSynced: num(r.offlineSynced) };
    if (r.grp === "affected") point.affected = metrics;
    else if (r.grp === "control") point.control = metrics;
    byMonth.set(month, point);
  }
  return {
    account,
    release: { id: String(first.releaseId), version: String(first.version), date: String(first.releaseDate).slice(0, 10) },
    affectedCount: Number(first.affectedCount) || 0,
    controlCount: Number(first.controlCount) || 0,
    points: [...byMonth.values()].sort((a, b) => (a.month < b.month ? -1 : 1)),
  };
}

/** Usage comparison for one account, or null when none of its outlets has a usage anomaly that coincides with a release. */
export async function fetchUsageComparison(run: CypherRunner, account: string): Promise<UsageComparison | null> {
  return buildUsageComparison(account, await run(USAGE_QUERY, { account }));
}
