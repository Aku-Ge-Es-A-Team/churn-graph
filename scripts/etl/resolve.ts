// Email → Kontak/Karyawan resolution (T01-04): exact match (case-insensitive) + manual aliases in `data/aliases.csv`.
// Emails that do not match are NOT guessed; they are recorded as input for F-16 (legacy email resolver).
import Papa from "papaparse";

export type EntityRef = { id: string; label: "Kontak" | "Karyawan" };

export type EmailIndex = {
  lookup(email: string): EntityRef | null;
  /** Emails matching more than one entity (not resolved, recorded). */
  ambiguous: Map<string, string[]>;
};

export function buildEmailIndex(
  contacts: readonly { contact_id: string; email: string | null }[],
  employees: readonly { employee_id: string; email: string }[],
  aliases: readonly { email: string; entity_id: string }[] = [],
): EmailIndex {
  const byEmail = new Map<string, EntityRef[]>();
  const add = (email: string, ref: EntityRef) => {
    const key = email.trim().toLowerCase();
    if (key === "") return;
    const refs = byEmail.get(key) ?? [];
    if (!refs.some((r) => r.id === ref.id)) refs.push(ref);
    byEmail.set(key, refs);
  };
  for (const c of contacts) if (c.email) add(c.email, { id: c.contact_id, label: "Kontak" });
  for (const e of employees) add(e.email, { id: e.employee_id, label: "Karyawan" });
  for (const a of aliases) {
    const ref = [...byEmail.values()].flat().find((r) => r.id === a.entity_id);
    if (ref) add(a.email, ref);
  }

  const ambiguous = new Map<string, string[]>();
  for (const [email, refs] of byEmail) if (refs.length > 1) ambiguous.set(email, refs.map((r) => r.id).sort());

  return {
    ambiguous,
    lookup(email: string) {
      const refs = byEmail.get(email.trim().toLowerCase());
      return refs && refs.length === 1 ? refs[0] : null;
    },
  };
}

/** `data/aliases.csv` (columns `email,entity_id`); a missing file means no aliases. */
export function parseAlias(text: string): { email: string; entity_id: string }[] {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, delimiter: ",", skipEmptyLines: true, dynamicTyping: false });
  return parsed.data
    .map((r) => ({ email: (r.email ?? "").trim(), entity_id: (r.entity_id ?? r.contact_id ?? "").trim() }))
    .filter((r) => r.email !== "" && r.entity_id !== "");
}
