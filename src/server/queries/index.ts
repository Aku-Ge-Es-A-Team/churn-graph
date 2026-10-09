// Server entry points used by pages and route handlers. Results are cached ('use cache' + cacheLife) because the graph
// only changes on `bun run rebuild`. The query logic itself lives in the sibling modules and takes an injected runner,
// which keeps it testable without Next.js.
import "server-only";
import { cacheLife } from "next/cache";
import { FOCUS_ACCOUNT_IDS, type AccountExplanation, type GraphPayload, type RetentionCard, type RiskRow, type Signal } from "../../types/graph";
import { readCypher } from "../neo4j";
import { getJevJudge } from "../ai/jev";
import { fetchAccountEvidence, type EvidenceResult } from "./evidence";
import { fetchAccountExplanation } from "./explanation";
import { fetchRetentionCard } from "./precedents";
import { judgeRetentionCard } from "./retention-judgement";
import { fetchRanking, fetchSignals } from "./risk";
import type { CypherRunner } from "./runner";

// Trusted internal queries: READ session, write clauses denied and 5 s timeout still apply; only the LIMIT ceiling is raised.
const run: CypherRunner = (query, params) => readCypher(query, params, { maxLimit: 5000 });

async function loadRanking(): Promise<RiskRow[]> {
  "use cache";
  cacheLife("minutes");
  return fetchRanking(run);
}

/** Ranked risk rows. `focus` keeps only the focus accounts C01–C06. */
export async function getRanking(options: { focus?: boolean } = {}): Promise<RiskRow[]> {
  const rows = await loadRanking();
  return options.focus ? rows.filter((r) => (FOCUS_ACCOUNT_IDS as readonly string[]).includes(r.account)) : rows;
}

export async function getSignals(account: string): Promise<Signal[]> {
  "use cache";
  cacheLife("minutes");
  return fetchSignals(run, account);
}

export async function getAccountEvidence(account: string, code?: string): Promise<EvidenceResult> {
  "use cache";
  cacheLife("minutes");
  return fetchAccountEvidence(run, account, code);
}

export type AccountDetail = {
  row: RiskRow;
  signals: Signal[];
  evidence: GraphPayload;
  explanation: AccountExplanation;
  retention: RetentionCard;
};

/** Everything the account page needs, or null when the account is not a known customer. */
export async function getAccountDetail(account: string): Promise<AccountDetail | null> {
  "use cache";
  cacheLife("minutes");
  const row = (await loadRanking()).find((r) => r.account === account);
  if (!row) return null;
  const [signals, evidence] = await Promise.all([fetchSignals(run, account), fetchAccountEvidence(run, account)]);
  if (evidence.status !== "ok") return null;
  const [explanation, ruleCard] = await Promise.all([fetchAccountExplanation(run, row, signals), fetchRetentionCard(run, row, signals)]);
  // JEV AI judges the rule-based candidates; without a key or on any failure the rule-based card is returned unchanged.
  const retention = await judgeRetentionCard(ruleCard, row, signals, getJevJudge());
  return { row, signals, evidence: evidence.payload, explanation, retention };
}
