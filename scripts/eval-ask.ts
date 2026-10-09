// Gate J12 / drill J15–16 (F-14): runs the 12 preset questions (or the questions given as arguments) through the real
// askQuestion against Aura + the LLM, and prints status, claims passed/discarded, tools called and duration.
// Run: bun run eval:ask            → 12 presets
//      bun run eval:ask "Kenapa C22 aman?" "Apa risiko C37?"   → custom questions
// Env (.env.local, loaded by Bun): NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL.
import { askQuestion } from "../src/server/ask/ask";
import { PRESET_QUESTIONS } from "../src/server/ask/presets";
import { getLlmModel } from "../src/server/ai/provider";
import { guardCypher } from "../src/server/cypher-guard";
import { toPlainValue } from "../src/server/neo4j-values";
import type { CypherRunner } from "../src/server/queries/runner";
import { createDriver, neo4j } from "./lib/neo4j";

// Same guarantees as readCypher (src/server/neo4j.ts is server-only and cannot be imported by Bun scripts):
// guard (write clauses denied, LIMIT forced) + READ session + 5 s transaction timeout.
const driver = createDriver();
const run: CypherRunner = async (query, params = {}) => {
  const guarded = guardCypher(query, { maxLimit: 5000 });
  if (!guarded.ok) throw new Error(`Query rejected: ${guarded.reason}`);
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.executeRead((tx) => tx.run(guarded.query, params), { timeout: 5000 });
    return result.records.map((r) => toPlainValue(r.toObject()) as Record<string, unknown>);
  } finally {
    await session.close();
  }
};

const questions = process.argv.length > 2 ? process.argv.slice(2) : [...PRESET_QUESTIONS];
const model = getLlmModel();
let answered = 0;

try {
  for (const [i, question] of questions.entries()) {
    const res = await askQuestion(question, { model, run });
    const withEvidence = (res.status === "ok" || res.status === "partial") && res.claims.length > 0;
    if (withEvidence) answered++;
    console.log(`\n[${i + 1}] ${question}`);
    console.log(
      `    status=${res.status} claims=${res.claims.length} discarded=${res.discarded} tools=${res.toolsCalled.join(",") || "-"} ${res.durationMs} ms`,
    );
    for (const c of res.claims) console.log(`    - ${c.text} [${c.evidenceIds.join(", ")}]`);
    if (res.note) console.log(`    note: ${res.note}`);
  }
  console.log(`\nAnswered with evidence: ${answered}/${questions.length}`);
  if (process.argv.length <= 2) {
    console.log(answered >= 6 ? "Gate J12 PASSED (≥6/12)." : "Gate J12 FAILED (<6/12): freeze F-14 as beta, demo with F-15 + Aura console.");
  }
} finally {
  await driver.close();
}
