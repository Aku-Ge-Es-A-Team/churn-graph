// Pure normalizers (T01-03) -- all covered by tests/etl/clean.test.ts.

export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** "YYYY-MM-DD" that is a real calendar date. */
export function isIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** `mode_offline_aktif`: "ya"/"tidak" (dataset values) → boolean; anything else null (rejected by the schema). */
export function parseYesNo(v: string): boolean | null {
  const x = v.trim().toLowerCase();
  if (x === "ya") return true;
  if (x === "tidak") return false;
  return null;
}

/** `batas_outlet_paket`: a number or the text "tanpa batas" (Enterprise; dataset value). */
export function parseLimit(v: string): { limit: number | null; unlimited: boolean } | null {
  const x = v.trim().toLowerCase();
  if (x === "tanpa batas") return { limit: null, unlimited: true };
  if (/^\d+$/.test(x)) return { limit: Number(x), unlimited: false };
  return null;
}

/**
 * `decision_log.nilai` read according to `tipe`: diskon → percentage ("15%" → 15), other types → text as is.
 * Returns null when a `diskon` value is not a percentage (the row is rejected, not guessed).
 * The result keys `nilai_teks`/`nilai_persen` are persisted graph properties.
 */
export function parseDecisionValue(
  type: string,
  raw: string,
): { nilai_teks: string; nilai_persen: number | null } | null {
  const text = raw.trim();
  if (type !== "diskon") return { nilai_teks: text, nilai_persen: null };
  const m = /^(\d+(?:[.,]\d+)?)\s*%$/.exec(text);
  if (!m) return null;
  return { nilai_teks: text, nilai_persen: Number(m[1].replace(",", ".")) };
}

/** Lowercase ASCII slug for derived IDs (ORG-..., KOMP-...). */
export function slug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Set of `isi` texts that appear ≥ `threshold` times (default 5) = template. Empty text is not counted. */
export function templateTexts(texts: readonly string[], threshold = 5): Set<string> {
  const counts = new Map<string, number>();
  for (const t of texts) {
    const k = t.trim();
    if (k !== "") counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const result = new Set<string>();
  for (const [k, n] of counts) if (n >= threshold) result.add(k);
  return result;
}

/** One reconciliation conflict between two sources. `field` holds a graph property name (e.g. "paket"). */
export type Conflict = { entity: string; field: string; other_source_value: string | number | null; used_value: string | number | null; used_source: string; note?: string };

/** CRM vs contract reconciliation: the contract value wins (F-01 §3). */
export function reconcileAccountContract(
  account: { account_id: string; paket: string | null; jumlah_outlet: number },
  contract: { paket: string; outlet_kontrak: number } | undefined,
): { paket: string | null; jumlah_outlet: number; conflicts: Conflict[] } {
  if (!contract) return { paket: account.paket, jumlah_outlet: account.jumlah_outlet, conflicts: [] };
  const conflicts: Conflict[] = [];
  if ((account.paket ?? "").toLowerCase() !== contract.paket.toLowerCase()) {
    conflicts.push({ entity: account.account_id, field: "paket", other_source_value: account.paket, used_value: contract.paket, used_source: "contracts_billing.csv" });
  }
  if (account.jumlah_outlet !== contract.outlet_kontrak) {
    conflicts.push({ entity: account.account_id, field: "jumlah_outlet", other_source_value: account.jumlah_outlet, used_value: contract.outlet_kontrak, used_source: "contracts_billing.csv" });
  }
  return { paket: contract.paket, jumlah_outlet: contract.outlet_kontrak, conflicts };
}

/** Deal vs contract: the value difference is recorded; "explained by discount" when deal value × (1 − discount) ≈ contract value. */
export function compareDealContract(
  deal: { deal_id: string; nilai_tahunan: number },
  contract: { nilai_tahunan: number; diskon_pct: number },
): Conflict | null {
  if (deal.nilai_tahunan === contract.nilai_tahunan) return null;
  const afterDiscount = deal.nilai_tahunan * (1 - contract.diskon_pct / 100);
  const explained = Math.abs(afterDiscount - contract.nilai_tahunan) <= 1;
  return {
    entity: deal.deal_id,
    field: "nilai_tahunan",
    other_source_value: deal.nilai_tahunan,
    used_value: contract.nilai_tahunan,
    used_source: "contracts_billing.csv",
    note: explained ? `explained by discount ${contract.diskon_pct}%` : "difference not explained by discount",
  };
}
