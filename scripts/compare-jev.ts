// Before/after comparison for the JEV AI judgement of retention actions (F-09). Read-only.
//   bun scripts/compare-jev.ts            -> C01..C06
//   bun scripts/compare-jev.ts C03 C04    -> chosen accounts
// For each account: the rule-based card (JEV off) next to the JEV-judged card. Costs and candidate actions must be identical.
import { getJevJudge } from "../src/server/ai/jev";
import { fetchRetentionCard } from "../src/server/queries/precedents";
import { judgeRetentionCard } from "../src/server/queries/retention-judgement";
import { fetchRanking, fetchSignals } from "../src/server/queries/risk";
import { FOCUS_ACCOUNT_IDS } from "../src/types/graph";
import { createDriver } from "./lib/neo4j";
import { createReadRunner } from "./lib/read-runner";

const judge = getJevJudge();
if (!judge) {
  console.error("TYPESAFE_API_KEY is not set in .env.local");
  process.exit(1);
}
const accounts = process.argv.length > 2 ? process.argv.slice(2) : [...FOCUS_ACCOUNT_IDS];
const driver = createDriver();
const run = createReadRunner(driver);
const ranking = await fetchRanking(run);

let identical = true;
for (const id of accounts) {
  const row = ranking.find((r) => r.account === id);
  if (!row) {
    console.log(`${id}: not found\n`);
    continue;
  }
  const signals = await fetchSignals(run, id);
  const rules = await fetchRetentionCard(run, row, signals);
  const started = Date.now();
  const jev = await judgeRetentionCard(rules, row, signals, judge);
  const ms = Date.now() - started;

  const costs = (c: typeof rules) => JSON.stringify(c.actions.map((a) => [a.type, a.cost?.amount ?? null]).sort());
  const same = costs(rules) === costs(jev) && rules.atRiskValue === jev.atRiskValue;
  identical &&= same;

  console.log(`== ${id} ${row.name} · ${row.level} · JEV ${jev.judgement ? `answered in ${ms} ms` : "no answer (fell back to rules)"}`);
  console.log(`   rules : ${rules.actions.map((a) => a.type).join(" > ") || "(no action)"}`);
  console.log(`   JEV   : ${jev.actions.map((a) => `${a.type}${a.urgency !== undefined ? ` [urgency ${a.urgency}]` : ""}`).join(" > ") || "(no action)"}`);
  if (jev.judgement) {
    const j = jev.judgement;
    console.log(`   first-action confidence ${j.confidence ?? "n/a"} · reordered ${j.reordered} · needs review ${j.needsReview} · discount suitability ${j.discountSuitability ?? "n/a"}`);
  }
  console.log(`   costs and at-risk value unchanged: ${same}\n`);
}
console.log(identical ? "OK: JEV changed no cost, candidate action or at-risk value." : "MISMATCH: a cost or candidate changed, investigate.");
await driver.close();
process.exit(identical ? 0 : 1);
