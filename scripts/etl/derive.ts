// v1 derived relations computed in the ETL (F-03, T03-01..03): MENJALANKAN_VERSI, Anomali (+ MENGALAMI, BERTEPATAN_DENGAN),
// MEMBALAS, and MENYEBUT (Interaksi → Kompetitor). KANDIDAT_DISEBABKAN_OLEH is computed with Cypher after the load
// (cypher/derive/kandidat_bug412.cypher). Every derived relation/node carries derived=true, rule, confidence.
//
// Provenance (ASSUMPTION F-02 §9): source_file = rules file (scripts/etl/derive.ts), source_id = ID of the derived element;
// the originating data file is named in props.dasar_file.
import { round2 } from "./clean";
import type { BuiltGraph, Dataset, DroppedRelation } from "./build";
import { assertUniqueIds } from "./build";
import { EtlError, type EtlEdge, type EtlNode } from "./types";

/** Persisted as `source_file` on every derived node/relation, so the value must not change. */
export const RULES_FILE = "scripts/etl/derive.ts";
/** Drop threshold for Anomali (a parameter, not a hidden constant). */
export const ANOMALY_THRESHOLD_PCT = 25;
/** Comparison window: Aug–Sep 2026 vs the Oct–Dec 2025 baseline (the baseline is computed in aggregate.ts). */
export const ANOMALY_WINDOW = ["2026-08", "2026-09"] as const;

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export type DerivedResult = {
  nodes: EtlNode[];
  edges: EtlEdge[];
  dropped: DroppedRelation[];
  report: {
    anomaly_threshold_pct: number;
    window: readonly string[];
    /** Count per relation type, plus the node label "Anomali". */
    counts: Record<string, number>;
    anomalies_without_release: string[];
    mentions_skipped_as_template: number;
    organizations_similar_to_competitors: { organization: string; competitor: string; note: string }[];
  };
};

export function deriveRelations(d: Dataset, base: BuiltGraph, options: { thresholdPct?: number } = {}): DerivedResult {
  const threshold = options.thresholdPct ?? ANOMALY_THRESHOLD_PCT;
  const nodes: EtlNode[] = [];
  const edges: EtlEdge[] = [];
  const dropped: DroppedRelation[] = [];
  const exists = new Set(base.nodes.map((n) => n.id));
  const labelById = new Map(base.nodes.map((n) => [n.id, n.label]));

  const addEdge = (type: string, from: string, to: string, sourceId: string, rule: string, confidence: number, props: Record<string, unknown> = {}) => {
    if (!exists.has(from) || !exists.has(to)) {
      dropped.push({ type, from, to, source_file: RULES_FILE, source_id: sourceId, reason: `${!exists.has(from) ? `source node '${from}'` : `target node '${to}'`} does not exist` });
      return;
    }
    edges.push({ key: `${type}:${from}->${to}`, type, from, to, derived: true, source_file: RULES_FILE, source_id: sourceId, props: { ...props, rule, confidence } });
  };

  // ---- T03-01: MENJALANKAN_VERSI (Outlet → Rilis), first date a version is seen in usage ----
  const dataStart = d.usage.flatMap((u) => u.months).map((m) => `${m.bulan}-01`).sort()[0] ?? "";
  for (const u of d.usage) {
    for (const [version, since] of Object.entries(u.versionSince)) {
      addEdge("MENJALANKAN_VERSI", u.outlet_id, `v${version}`, `${u.outlet_id}|${version}`, "versi_dari_usage", 1, {
        sejak: since,
        sejak_adalah_awal_data: since === dataStart,
        dasar_file: "product_usage_daily.csv",
      });
    }
  }

  // ---- T03-02: Anomali (+ MENGALAMI, BERTEPATAN_DENGAN) ----
  const anomaliesWithoutRelease: string[] = [];
  for (const u of d.usage) {
    const windowMonths = u.months.filter((m) => (ANOMALY_WINDOW as readonly string[]).includes(m.bulan));
    const days = windowMonths.reduce((s, m) => s + m.hari_tercatat, 0);
    const baseline = u.months[0]?.baseline_rata_harian ?? null;
    if (days === 0 || !baseline) continue;
    const current = windowMonths.reduce((s, m) => s + m.total_transaksi, 0) / days;
    const delta = ((current - baseline) / baseline) * 100;
    if (delta > -threshold) continue;

    const id = `ANM-${u.outlet_id}`;
    nodes.push({
      key: id, id, label: "Anomali", sumber: "turunan", source_file: RULES_FILE, source_id: id,
      props: {
        outlet_id: u.outlet_id,
        account_id: u.account_id,
        metrik: "rata_harian_transaksi",
        jendela: `${ANOMALY_WINDOW[0]}..${ANOMALY_WINDOW[1]}`,
        baseline,
        terkini: round2(current),
        delta_pct: round2(delta),
        ambang_pct: threshold,
        derived: true,
        rule: "usage_turun_vs_baseline",
        confidence: 0.9,
        dasar_file: "product_usage_daily.csv",
      },
    });
    exists.add(id);
    labelById.set(id, "Anomali");
    addEdge("MENGALAMI", u.outlet_id, id, id, "usage_turun_vs_baseline", 0.9);

    // Coinciding release: the version the outlet adopted last, after the start of the data and before the window ends.
    const windowEnd = `${ANOMALY_WINDOW[1]}-31`;
    const adopted = Object.entries(u.versionSince)
      .filter(([, since]) => since > dataStart && since <= windowEnd)
      .sort((a, b) => compare(a[1], b[1]));
    const latest = adopted.at(-1);
    if (latest) {
      addEdge("BERTEPATAN_DENGAN", id, `v${latest[0]}`, id, "anomali_bertepatan_rilis", 0.8, { sejak: latest[1] });
    } else {
      anomaliesWithoutRelease.push(id);
    }
  }

  // ---- T03-03a: MEMBALAS (from membalas_id) ----
  for (const i of d.interactions) {
    if (i.membalas_id) addEdge("MEMBALAS", i.interaction_id, i.membalas_id, i.interaction_id, "membalas_id", 1, { dasar_file: d.interactionFile });
  }

  // ---- T03-03b: MENYEBUT (non-template Interaksi → Kompetitor, dictionary from crm_deals.kompetitor) ----
  const dictionary = base.nodes.filter((n) => n.label === "Kompetitor").map((n) => ({ id: n.id, name: String(n.props.nama) }));
  const templateById = new Map(base.nodes.filter((n) => n.label === "Interaksi").map((n) => [n.id, n.props.template === true]));
  let skipped = 0;
  const wordPattern = (name: string) => new RegExp(`(?<![\\p{L}\\p{N}])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu");
  for (const k of dictionary) {
    const pattern = wordPattern(k.name);
    for (const i of d.interactions) {
      if (!pattern.test(`${i.subjek ?? ""} ${i.isi}`)) continue;
      if (templateById.get(i.interaction_id)) {
        skipped++;
        continue;
      }
      addEdge("MENYEBUT", i.interaction_id, k.id, i.interaction_id, "kamus_kompetitor", 0.9, { dasar_file: d.interactionFile });
    }
  }

  // Organizations whose name resembles a competitor are only CHECKED, not merged (unverified inference).
  const similar: DerivedResult["report"]["organizations_similar_to_competitors"] = [];
  for (const k of dictionary) {
    const tokens = k.name.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
    for (const o of base.nodes.filter((n) => n.label === "Organisasi")) {
      const name = String(o.props.nama);
      const parts = name.toLowerCase().split(/[^a-z0-9]+/);
      const shared = tokens.filter((t) => parts.some((p) => p.length >= 4 && (p.includes(t) || t.includes(p))));
      if (shared.length > 0) similar.push({ organization: name, competitor: k.name, note: "similar name; NOT merged (inference not verified)" });
    }
  }

  const counts: Record<string, number> = {};
  for (const e of edges) counts[e.type] = (counts[e.type] ?? 0) + 1;
  counts.Anomali = nodes.length;

  return {
    nodes,
    edges,
    dropped,
    report: {
      anomaly_threshold_pct: threshold,
      window: ANOMALY_WINDOW,
      counts: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => compare(a, b))),
      anomalies_without_release: anomaliesWithoutRelease.sort(),
      mentions_skipped_as_template: skipped,
      organizations_similar_to_competitors: similar,
    },
  };
}

/** Merge the base graph + derived elements: IDs stay unique, relation keys are not duplicated, order is stable. */
export function mergeGraphs(base: BuiltGraph, derived: DerivedResult): { nodes: EtlNode[]; edges: EtlEdge[] } {
  const nodes = [...base.nodes, ...derived.nodes].sort((x, y) => compare(x.label, y.label) || compare(x.id, y.id));
  assertUniqueIds(nodes);
  const edges = [...base.edges, ...derived.edges].sort((x, y) => compare(x.key, y.key));
  const seen = new Set<string>();
  for (const e of edges) {
    if (seen.has(e.key)) throw new EtlError(`Duplicate relation key: ${e.key}`);
    seen.add(e.key);
  }
  return { nodes, edges };
}
