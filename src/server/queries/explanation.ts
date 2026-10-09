// Explanation for accounts without material findings (F-07): why is account X "consistent"?
// Generic for every account; no account IDs are hard-coded.
import { SIGNAL_CODES, type AccountExplanation, type RiskRow, type Signal } from "../../types/graph";
import type { CypherRunner } from "./runner";

/** Z1: tickets whose category is "feature request" (dataset vocabulary: permintaan_fitur). */
export async function fetchFeatureRequestTickets(run: CypherRunner, account: string): Promise<{ id: string; title: string }[]> {
  const rows = await run(
    `MATCH (t:Tiket {account_id: $account, kategori: 'permintaan_fitur'})
     RETURN t.id AS id, t.judul AS title
     ORDER BY id`,
    { account },
  );
  return rows.map((r) => ({ id: String(r.id), title: String(r.title ?? "") }));
}

/** Pure part: builds the explanation from the ranking row and the account's signals. */
export function buildExplanation(row: RiskRow, signals: Signal[], tickets: { id: string; title: string }[]): AccountExplanation {
  const rules = SIGNAL_CODES.map((code) => {
    const hits = signals.filter((s) => s.code === code);
    return hits.length > 0
      ? { code, status: "triggered" as const, weight: hits.reduce((sum, s) => sum + s.weight, 0) }
      : { code, status: "clear" as const, weight: null };
  });
  return {
    account: row.account,
    name: row.name,
    level: row.level,
    status: row.level === "Safe" ? "consistent" : "at_risk",
    rules,
    featureRequestTickets: { count: tickets.length, ticketIds: tickets.map((t) => t.id), titles: tickets },
  };
}

export async function fetchAccountExplanation(run: CypherRunner, row: RiskRow, signals: Signal[]): Promise<AccountExplanation> {
  const tickets = await fetchFeatureRequestTickets(run, row.account);
  return buildExplanation(row, signals, tickets);
}
