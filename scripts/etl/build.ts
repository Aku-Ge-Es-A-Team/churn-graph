// Builds the FACT nodes + relations from the validated data (T01-06).
// Derived relations (MENJALANKAN_VERSI, Anomali, MEMBALAS, MENYEBUT from interactions, KANDIDAT_...) are not part of F-01.
import { compareDealContract, reconcileAccountContract, slug, templateTexts, type Conflict } from "./clean";
import type { EmailIndex } from "./resolve";
import type { Row } from "./schemas";
import type { ACCOUNT, BUG, CONTACT, CONTRACT, DEAL, DECISION, EMPLOYEE, EMPLOYMENT_HISTORY, FEATURE, INTERACTION, OUTLET, RELEASE, TICKET } from "./schemas";
import { EtlError, type EtlEdge, type EtlNode, type Source } from "./types";
import type { OutletUsage } from "./aggregate";

export type Dataset = {
  accounts: Row<typeof ACCOUNT>[];
  contacts: Row<typeof CONTACT>[];
  history: Row<typeof EMPLOYMENT_HISTORY>[];
  employees: Row<typeof EMPLOYEE>[];
  deals: Row<typeof DEAL>[];
  outlets: Row<typeof OUTLET>[];
  tickets: Row<typeof TICKET>[];
  bugs: Row<typeof BUG>[];
  releases: Row<typeof RELEASE>[];
  features: Row<typeof FEATURE>[];
  contracts: Row<typeof CONTRACT>[];
  decisions: Row<typeof DECISION>[];
  interactions: Row<typeof INTERACTION>[];
  usage: OutletUsage[];
  /** Name of the interactions file that was read (`interactions.jsonl` is official; `interactions.json` is accepted as a fallback). */
  interactionFile: string;
  /** App version according to usage at the `${outlet}|${date}` of each ticket. */
  versionOnDate: ReadonlyMap<string, string>;
};

export type DroppedRelation = { type: string; from: string; to: string; source_file: string; source_id: string; reason: string };

export type BuiltGraph = {
  nodes: EtlNode[];
  edges: EtlEdge[];
  dropped_relations: DroppedRelation[];
  account_contract_conflicts: Conflict[];
  deal_contract_differences: Conflict[];
  interaction_templates: { count: number; total: number; threshold: number };
  unresolved_emails: { email: string; reason: string; count: number; fields: string[]; interactions: string[] }[];
  unknown_meeting_participants: { interaction: string; participant: string }[];
  ticket_vs_usage_versions: {
    /** Tickets that record a version the outlet NEVER used in the usage data (Brief §3.3: T0531, T0600, T0636). */
    never_in_usage: { ticket: string; outlet: string; outlet_offline: boolean; created: string; ticket_version: string; outlet_usage_versions: string[] }[];
    /** Tickets whose version differs from the usage version on the ticket date (gradual rollout; counted only). */
    differs_on_date: number;
  };
  stale_crm_champions: { account: string; contact: string; ended: string; moved_to: string[] }[];
};

const FILE = {
  accounts: "crm_accounts.csv",
  contacts: "crm_contacts.csv",
  history: "contact_employment_history.csv",
  employees: "employees.csv",
  deals: "crm_deals.csv",
  outlets: "outlets.csv",
  usage: "product_usage_daily.csv",
  tickets: "support_tickets.csv",
  bugs: "bugs.csv",
  releases: "releases.csv",
  features: "features.csv",
  contracts: "contracts_billing.csv",
  decisions: "decision_log.csv",
  interactions: "interactions.jsonl",
} as const;

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function omit<T extends Record<string, unknown>>(obj: T, ...keys: string[]): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
}

/** A duplicate ID across labels stops the ETL: `MERGE` in F-02 would silently merge them. */
export function assertUniqueIds(nodes: readonly EtlNode[]): void {
  const labels = new Map<string, string[]>();
  for (const n of nodes) labels.set(n.id, [...(labels.get(n.id) ?? []), n.label]);
  const duplicates = [...labels.entries()].filter(([, l]) => l.length > 1);
  if (duplicates.length > 0) {
    const examples = duplicates.slice(0, 5).map(([id, l]) => `${id} (${l.join(", ")})`).join("; ");
    throw new EtlError(`Duplicate IDs (${duplicates.length}): ${examples}`);
  }
}

export function buildGraph(d: Dataset, options: { emailIndex: EmailIndex; snapshot: string }): BuiltGraph {
  const nodes: EtlNode[] = [];
  const addNode = (label: string, id: string, source: Source, file: string, sourceId: string, props: Record<string, unknown>) =>
    nodes.push({ key: id, id, label, sumber: source, source_file: file, source_id: sourceId, props });

  // ---- Account/contract reconciliation (the contract value wins) ----
  const contractByAccount = new Map(d.contracts.map((k) => [k.account_id, k]));
  const accountContractConflicts: Conflict[] = [];
  for (const a of d.accounts) {
    const rec = reconcileAccountContract(a, contractByAccount.get(a.account_id));
    accountContractConflicts.push(...rec.conflicts);
    addNode("Akun", a.account_id, "crm", FILE.accounts, a.account_id, {
      ...omit(a, "account_id", "paket", "jumlah_outlet"),
      paket: rec.paket,
      jumlah_outlet: rec.jumlah_outlet,
    });
  }

  const dealDifferences: Conflict[] = [];
  for (const deal of d.deals) {
    const contract = contractByAccount.get(deal.account_id);
    const difference = contract ? compareDealContract(deal, contract) : null;
    if (difference) dealDifferences.push(difference);
  }

  for (const c of d.contacts) addNode("Kontak", c.contact_id, "crm", FILE.contacts, c.contact_id, omit(c, "contact_id"));
  for (const e of d.employees) addNode("Karyawan", e.employee_id, "crm", FILE.employees, e.employee_id, omit(e, "employee_id"));

  // ---- Non-customer organizations (employment history without account_id) ----
  const orgIds = new Map<string, string>();
  for (const r of d.history) {
    if (r.account_id !== null || orgIds.has(r.organisasi)) continue;
    const id = `ORG-${slug(r.organisasi)}`;
    orgIds.set(r.organisasi, id);
    addNode("Organisasi", id, "crm", FILE.history, `${r.contact_id}|${r.mulai}`, { nama: r.organisasi });
  }

  // ---- Competitors (from crm_deals.kompetitor) ----
  const competitorIds = new Map<string, string>();
  for (const deal of d.deals) {
    if (deal.kompetitor === null || competitorIds.has(deal.kompetitor)) continue;
    const id = `KOMP-${slug(deal.kompetitor)}`;
    competitorIds.set(deal.kompetitor, id);
    addNode("Kompetitor", id, "crm", FILE.deals, deal.deal_id, { nama: deal.kompetitor });
  }

  // ---- Product: releases, features, bugs ----
  for (const r of d.releases) addNode("Rilis", `v${r.versi}`, "tiket", FILE.releases, r.versi, { versi: r.versi, tanggal_rilis: r.tanggal_rilis });
  for (const f of d.features) addNode("Fitur", f.feature_id, "tiket", FILE.features, f.feature_id, omit(f, "feature_id"));
  for (const b of d.bugs) addNode("Bug", b.bug_id, "tiket", FILE.bugs, b.bug_id, omit(b, "bug_id"));

  // ---- Outlets + UsageBulan ----
  const usageByOutlet = new Map(d.usage.map((u) => [u.outlet_id, u]));
  for (const o of d.outlets) {
    const u = usageByOutlet.get(o.outlet_id);
    addNode("Outlet", o.outlet_id, "usage", FILE.outlets, o.outlet_id, {
      ...omit(o, "outlet_id"),
      hari_usage: u?.daysRecorded ?? 0,
      versi_sejak: u?.versionSince ?? {},
      versi_terakhir: u?.lastVersion ?? null,
    });
  }
  for (const u of d.usage) {
    for (const m of u.months) {
      addNode("UsageBulan", `USG-${m.outlet_id}-${m.bulan}`, "usage", FILE.usage, `${m.outlet_id}|${m.bulan}`, omit(m));
    }
  }

  // ---- Tickets (+ ticket version vs usage check) ----
  const neverInUsage: BuiltGraph["ticket_vs_usage_versions"]["never_in_usage"] = [];
  let differsOnDate = 0;
  const offlineByOutlet = new Map(d.outlets.map((o) => [o.outlet_id, o.mode_offline]));
  for (const t of d.tickets) {
    const usageVersion = t.outlet_id ? (d.versionOnDate.get(`${t.outlet_id}|${t.dibuat}`) ?? null) : null;
    const matches = t.versi_aplikasi !== null && usageVersion !== null ? t.versi_aplikasi === usageVersion : null;
    if (matches === false) differsOnDate++;
    const seen = t.outlet_id ? Object.keys(usageByOutlet.get(t.outlet_id)?.versionSince ?? {}) : [];
    if (t.outlet_id && t.versi_aplikasi && seen.length > 0 && !seen.includes(t.versi_aplikasi)) {
      neverInUsage.push({ ticket: t.ticket_id, outlet: t.outlet_id, outlet_offline: offlineByOutlet.get(t.outlet_id) === true, created: t.dibuat, ticket_version: t.versi_aplikasi, outlet_usage_versions: seen });
    }
    addNode("Tiket", t.ticket_id, "tiket", FILE.tickets, t.ticket_id, { ...omit(t, "ticket_id"), versi_usage: usageVersion, versi_cocok_usage: matches });
  }

  // ---- Contracts, Deals, Decisions ----
  for (const k of d.contracts) addNode("Kontrak", k.contract_id, "kontrak", FILE.contracts, k.contract_id, omit(k, "contract_id"));
  for (const deal of d.deals) addNode("Deal", deal.deal_id, "crm", FILE.deals, deal.deal_id, omit(deal, "deal_id"));
  for (const k of d.decisions) addNode("Keputusan", k.decision_id, "keputusan", FILE.decisions, k.decision_id, omit(k, "decision_id"));

  // ---- Interactions: template + email resolution ----
  const templateSet = templateTexts(d.interactions.map((i) => i.isi), 5);
  const unresolved = new Map<string, { reason: string; fields: Set<string>; interactions: Set<string> }>();
  const recordEmail = (email: string, field: string, interaction: string, reason: string) => {
    const key = email.trim().toLowerCase();
    const entry = unresolved.get(key) ?? { reason, fields: new Set<string>(), interactions: new Set<string>() };
    entry.fields.add(field);
    entry.interactions.add(interaction);
    unresolved.set(key, entry);
  };
  const resolved = new Map<string, { from: string | null; to: string | null }>();
  let templateCount = 0;
  for (const i of d.interactions) {
    const resolve = (email: string | null, field: string): string | null => {
      if (email === null) return null;
      const ref = options.emailIndex.lookup(email);
      if (ref) return ref.id;
      recordEmail(email, field, i.interaction_id, options.emailIndex.ambiguous.has(email.trim().toLowerCase()) ? "ambiguous: matches >1 entity" : "not found in crm_contacts/employees/aliases");
      return null;
    };
    const fromId = resolve(i.dari, "dari");
    const toId = resolve(i.ke, "ke");
    resolved.set(i.interaction_id, { from: fromId, to: toId });
    const template = templateSet.has(i.isi);
    if (template) templateCount++;
    addNode("Interaksi", i.interaction_id, "interaksi", d.interactionFile, i.interaction_id, {
      ...omit(i, "interaction_id"),
      template,
      dari_id: fromId,
      ke_id: toId,
    });
  }

  assertUniqueIds(nodes);

  // ---- FACT relations ----
  const labelById = new Map(nodes.map((n) => [n.id, n.label]));
  const edges: EtlEdge[] = [];
  const dropped: DroppedRelation[] = [];
  const seenKeys = new Set<string>();
  const connect = (type: string, from: string, to: string, file: string, sourceId: string, props: Record<string, unknown> = {}, discriminator?: string) => {
    if (!labelById.has(from) || !labelById.has(to)) {
      dropped.push({ type, from, to, source_file: file, source_id: sourceId, reason: `${!labelById.has(from) ? `source node '${from}'` : `target node '${to}'`} does not exist` });
      return;
    }
    const key = `${type}:${from}->${to}${discriminator ? `:${discriminator}` : ""}`;
    if (seenKeys.has(key)) throw new EtlError(`Duplicate relation key: ${key} (${file} ${sourceId})`);
    seenKeys.add(key);
    edges.push({ key, type, from, to, derived: false, source_file: file, source_id: sourceId, props });
  };

  for (const r of d.history) {
    const target = r.account_id ?? orgIds.get(r.organisasi)!;
    const sid = `${r.contact_id}|${r.mulai}`;
    if (r.selesai === null) connect("BEKERJA_DI", r.contact_id, target, FILE.history, sid, { mulai: r.mulai, jabatan: r.jabatan }, r.mulai);
    else connect("PERNAH_BEKERJA_DI", r.contact_id, target, FILE.history, sid, { mulai: r.mulai, selesai: r.selesai, jabatan: r.jabatan }, r.mulai);
  }
  for (const a of d.accounts) {
    if (a.champion_contact_id) connect("CHAMPION_DARI", a.champion_contact_id, a.account_id, FILE.accounts, a.account_id, { klaim: "crm" });
    connect("DIPEGANG_OLEH", a.account_id, a.account_owner_id, FILE.accounts, a.account_id);
  }
  for (const o of d.outlets) connect("MEMILIKI", o.account_id, o.outlet_id, FILE.outlets, o.outlet_id);
  for (const k of d.contracts) connect("MEMILIKI", k.account_id, k.contract_id, FILE.contracts, k.contract_id);
  for (const deal of d.deals) {
    connect("MEMILIKI", deal.account_id, deal.deal_id, FILE.deals, deal.deal_id);
    if (deal.kompetitor) connect("MENYEBUT", deal.deal_id, competitorIds.get(deal.kompetitor)!, FILE.deals, deal.deal_id);
  }
  for (const t of d.tickets) {
    if (t.outlet_id) connect("MEMBUKA_TIKET", t.outlet_id, t.ticket_id, FILE.tickets, t.ticket_id);
    // ASSUMPTION: a ticket without an outlet must still be linked to its account, so Akun → Tiket (flagged tanpa_outlet).
    else connect("MEMBUKA_TIKET", t.account_id, t.ticket_id, FILE.tickets, t.ticket_id, { tanpa_outlet: true });
    if (t.pelapor_contact_id) connect("MEMBUKA_TIKET", t.pelapor_contact_id, t.ticket_id, FILE.tickets, t.ticket_id, { pelapor: true });
    if (t.bug_id) connect("DISEBABKAN_OLEH", t.ticket_id, t.bug_id, FILE.tickets, t.ticket_id);
  }
  for (const b of d.bugs) {
    connect("TERDAPAT_DI", b.bug_id, `v${b.versi_terdampak}`, FILE.bugs, b.bug_id);
    if (b.fitur_terkait) connect("TERKAIT", b.bug_id, b.fitur_terkait, FILE.bugs, b.bug_id);
  }
  for (const u of d.usage) for (const m of u.months) connect("MENCATAT", u.outlet_id, `USG-${m.outlet_id}-${m.bulan}`, FILE.usage, `${m.outlet_id}|${m.bulan}`);

  // The discriminators "pengirim"/"penerima"/"peserta" and the `peran` values are persisted in relation keys/properties.
  const unknownParticipants: BuiltGraph["unknown_meeting_participants"] = [];
  for (const i of d.interactions) {
    const r = resolved.get(i.interaction_id)!;
    if (r.from) connect("TERLIBAT_DI", r.from, i.interaction_id, d.interactionFile, i.interaction_id, { peran: "pengirim" }, "pengirim");
    if (r.to) connect("TERLIBAT_DI", r.to, i.interaction_id, d.interactionFile, i.interaction_id, { peran: "penerima" }, "penerima");
    for (const p of new Set(i.peserta)) {
      const label = labelById.get(p);
      if (label !== "Kontak" && label !== "Karyawan") {
        unknownParticipants.push({ interaction: i.interaction_id, participant: p });
        continue;
      }
      connect("TERLIBAT_DI", p, i.interaction_id, d.interactionFile, i.interaction_id, { peran: "peserta" }, "peserta");
    }
    if (i.account_id) connect("TENTANG", i.interaction_id, i.account_id, d.interactionFile, i.interaction_id);
  }

  for (const k of d.decisions) {
    connect("MENYETUJUI", k.diputuskan_oleh, k.decision_id, FILE.decisions, k.decision_id);
    if (k.bukti_interaction_id) connect("DIDASARKAN_PADA", k.decision_id, k.bukti_interaction_id, FILE.decisions, k.decision_id);
    if (k.fitur_dijanjikan) connect("MENJANJIKAN", k.decision_id, k.fitur_dijanjikan, FILE.decisions, k.decision_id, { status_janji: k.status_janji });
  }
  for (const k of d.contracts) if (k.decision_id) connect("DIDASARKAN_PADA", k.contract_id, k.decision_id, FILE.contracts, k.contract_id);

  // ---- CRM champions who already left (stale CRM claim; input for F-04 signals, not a data correction) ----
  const staleChampions: BuiltGraph["stale_crm_champions"] = [];
  for (const a of d.accounts) {
    const c = a.champion_contact_id;
    if (!c) continue;
    const stints = d.history.filter((r) => r.contact_id === c && r.account_id === a.account_id);
    if (stints.length === 0 || stints.some((r) => r.selesai === null)) continue;
    const ended = stints.map((r) => r.selesai!).sort(compare).at(-1)!;
    if (ended > options.snapshot) continue;
    const movedTo = d.history
      .filter((r) => r.contact_id === c && r.mulai >= ended && r.account_id !== a.account_id)
      .map((r) => r.account_id ?? orgIds.get(r.organisasi)!)
      .sort(compare);
    staleChampions.push({ account: a.account_id, contact: c, ended, moved_to: movedTo });
  }

  nodes.sort((x, y) => compare(x.label, y.label) || compare(x.id, y.id));
  edges.sort((x, y) => compare(x.key, y.key));

  return {
    nodes,
    edges,
    dropped_relations: dropped.sort((x, y) => compare(`${x.type}:${x.from}:${x.to}`, `${y.type}:${y.from}:${y.to}`)),
    account_contract_conflicts: accountContractConflicts,
    deal_contract_differences: dealDifferences,
    interaction_templates: { count: templateCount, total: d.interactions.length, threshold: 5 },
    unresolved_emails: [...unresolved.entries()]
      .map(([email, s]) => ({ email, reason: s.reason, count: s.interactions.size, fields: [...s.fields].sort(), interactions: [...s.interactions].sort() }))
      .sort((x, y) => y.count - x.count || compare(x.email, y.email)),
    unknown_meeting_participants: unknownParticipants,
    ticket_vs_usage_versions: { never_in_usage: neverInUsage.sort((x, y) => compare(x.ticket, y.ticket)), differs_on_date: differsOnDate },
    stale_crm_champions: staleChampions,
  };
}

/** Data sources reachable within ≤ 2 hops of an account (not passing through hub nodes) -- evidence path sufficiency check. */
export function evidenceCoverage(nodes: readonly EtlNode[], edges: readonly EtlEdge[], accountIds: readonly string[]) {
  const HUB = new Set(["Karyawan", "Rilis", "Organisasi", "Kompetitor"]);
  const labelById = new Map(nodes.map((n) => [n.id, n.label]));
  const sourceById = new Map(nodes.map((n) => [n.id, n.sumber]));
  const neighbors = new Map<string, string[]>();
  for (const e of edges) {
    (neighbors.get(e.from) ?? neighbors.set(e.from, []).get(e.from)!).push(e.to);
    (neighbors.get(e.to) ?? neighbors.set(e.to, []).get(e.to)!).push(e.from);
  }
  return accountIds.map((account) => {
    const visited = new Set<string>([account]);
    let frontier = [account];
    for (let hop = 0; hop < 2; hop++) {
      const next: string[] = [];
      for (const id of frontier) {
        if (hop > 0 && HUB.has(labelById.get(id) ?? "")) continue;
        for (const t of neighbors.get(id) ?? []) if (!visited.has(t)) { visited.add(t); next.push(t); }
      }
      frontier = next;
    }
    const byLabel: Record<string, number> = {};
    const sources = new Set<string>();
    for (const id of visited) {
      byLabel[labelById.get(id)!] = (byLabel[labelById.get(id)!] ?? 0) + 1;
      sources.add(sourceById.get(id)!);
    }
    return { account, source_count: sources.size, sources: [...sources].sort(), nodes_by_label: Object.fromEntries(Object.entries(byLabel).sort(([a], [b]) => compare(a, b))) };
  });
}
