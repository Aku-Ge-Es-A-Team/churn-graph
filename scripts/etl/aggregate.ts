// Daily usage → UsageBulan aggregation (T01-05). Processed row by row (streaming): the 226 thousand daily rows
// are never held in memory, only one accumulator per outlet-month.
import { round2 } from "./clean";

/** One daily usage row; the field names mirror the dataset columns. */
export type UsageRow = {
  tanggal: string;
  outlet_id: string;
  account_id: string;
  versi_aplikasi: string;
  jumlah_transaksi: number;
  transaksi_offline_tersinkron: number | null;
};

const BASELINE_MONTHS = new Set(["2025-10", "2025-11", "2025-12"]);

type MonthAgg = { days: number; total: number; offlineTotal: number; offlineDays: number; versions: Map<string, number> };
type OutletAgg = {
  account: string;
  months: Map<string, MonthAgg>;
  baseSum: number;
  baseN: number;
  baseOfflineSum: number;
  baseOfflineN: number;
  versionSince: Map<string, string>;
  latest: { date: string; version: string } | null;
  days: number;
};

/** The keys of this record become properties of the `UsageBulan` node, so they keep the graph vocabulary. */
export type MonthlyUsage = {
  outlet_id: string;
  account_id: string;
  bulan: string;
  hari_tercatat: number;
  total_transaksi: number;
  rata_harian_transaksi: number;
  total_offline_tersinkron: number | null;
  rata_harian_offline: number | null;
  versi_utama: string;
  versi_terlihat: string[];
  baseline_rata_harian: number | null;
  delta_pct: number | null;
  baseline_offline_rata_harian: number | null;
  delta_offline_pct: number | null;
};

export type OutletUsage = {
  outlet_id: string;
  account_id: string;
  daysRecorded: number;
  /** version → first date seen in usage */
  versionSince: Record<string, string>;
  lastVersion: string | null;
  months: MonthlyUsage[];
};

export class UsageAggregator {
  private readonly outlets = new Map<string, OutletAgg>();
  /** App version according to usage for the requested `${outlet}|${date}` pairs (tickets). */
  readonly versionOnDate = new Map<string, string>();

  /** @param neededVersions `${outlet}|${date}` pairs whose version must be recorded (from tickets). */
  constructor(private readonly neededVersions: ReadonlySet<string> = new Set()) {}

  add(r: UsageRow): void {
    let o = this.outlets.get(r.outlet_id);
    if (!o) {
      o = { account: r.account_id, months: new Map(), baseSum: 0, baseN: 0, baseOfflineSum: 0, baseOfflineN: 0, versionSince: new Map(), latest: null, days: 0 };
      this.outlets.set(r.outlet_id, o);
    }
    const month = r.tanggal.slice(0, 7);
    let m = o.months.get(month);
    if (!m) {
      m = { days: 0, total: 0, offlineTotal: 0, offlineDays: 0, versions: new Map() };
      o.months.set(month, m);
    }
    o.days++;
    m.days++;
    m.total += r.jumlah_transaksi;
    m.versions.set(r.versi_aplikasi, (m.versions.get(r.versi_aplikasi) ?? 0) + 1);
    if (r.transaksi_offline_tersinkron !== null) {
      m.offlineTotal += r.transaksi_offline_tersinkron;
      m.offlineDays++;
    }
    if (BASELINE_MONTHS.has(month)) {
      o.baseSum += r.jumlah_transaksi;
      o.baseN++;
      if (r.transaksi_offline_tersinkron !== null) {
        o.baseOfflineSum += r.transaksi_offline_tersinkron;
        o.baseOfflineN++;
      }
    }
    const since = o.versionSince.get(r.versi_aplikasi);
    if (since === undefined || r.tanggal < since) o.versionSince.set(r.versi_aplikasi, r.tanggal);
    if (o.latest === null || r.tanggal > o.latest.date) o.latest = { date: r.tanggal, version: r.versi_aplikasi };
    const key = `${r.outlet_id}|${r.tanggal}`;
    if (this.neededVersions.has(key)) this.versionOnDate.set(key, r.versi_aplikasi);
  }

  /** Stably sorted result (outlet, then month) so the output is deterministic. */
  finish(): OutletUsage[] {
    const result: OutletUsage[] = [];
    for (const id of [...this.outlets.keys()].sort()) {
      const o = this.outlets.get(id)!;
      const base = o.baseN > 0 ? o.baseSum / o.baseN : null;
      const baseOffline = o.baseOfflineN > 0 ? o.baseOfflineSum / o.baseOfflineN : null;
      const months: MonthlyUsage[] = [];
      for (const month of [...o.months.keys()].sort()) {
        const m = o.months.get(month)!;
        const avg = m.total / m.days;
        const avgOffline = m.offlineDays > 0 ? m.offlineTotal / m.offlineDays : null;
        const versionsByUse = [...m.versions.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
        months.push({
          outlet_id: id,
          account_id: o.account,
          bulan: month,
          hari_tercatat: m.days,
          total_transaksi: m.total,
          rata_harian_transaksi: round2(avg),
          total_offline_tersinkron: m.offlineDays > 0 ? m.offlineTotal : null,
          rata_harian_offline: avgOffline === null ? null : round2(avgOffline),
          versi_utama: versionsByUse[0][0],
          versi_terlihat: [...m.versions.keys()].sort(),
          baseline_rata_harian: base === null ? null : round2(base),
          delta_pct: base ? round2(((avg - base) / base) * 100) : null,
          baseline_offline_rata_harian: baseOffline === null ? null : round2(baseOffline),
          delta_offline_pct: baseOffline && avgOffline !== null ? round2(((avgOffline - baseOffline) / baseOffline) * 100) : null,
        });
      }
      result.push({
        outlet_id: id,
        account_id: o.account,
        daysRecorded: o.days,
        versionSince: Object.fromEntries([...o.versionSince.entries()].sort()),
        lastVersion: o.latest?.version ?? null,
        months,
      });
    }
    return result;
  }
}
