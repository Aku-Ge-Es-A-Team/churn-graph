// Manual validation helper for F-14 (read-only): ask one question end to end against Aura and the 9router LLM.
//   bun scripts/demo-ask.ts "Why is C01 critical while the dashboard is green?"
//   JEV=off bun scripts/demo-ask.ts "..."   (skip the JEV AI intent routing, for a before/after comparison)
// Uses the same pipeline as POST /api/ask (src/server/ask/ask.ts) and the same Cypher guard; it is not an endpoint.
import { getJevJudge } from "../src/server/ai/jev";
import { getLlmModel } from "../src/server/ai/provider";
import { ask, defaultGenerate } from "../src/server/ask/ask";
import { createIntentClassifier } from "../src/server/ask/intent";
import { ConfigError, createDriver } from "./lib/neo4j";
import { createReadRunner } from "./lib/read-runner";

const question = process.argv.slice(2).join(" ").trim();
if (question.length < 3) {
  console.error('Usage: bun scripts/demo-ask.ts "<question>"');
  process.exit(2);
}

try {
  const driver = createDriver();
  const run = createReadRunner(driver);

  const started = Date.now();
  const llm = defaultGenerate(getLlmModel());
  const generate: typeof llm = async (args) => {
    const out = await llm(args);
    if (process.env.ASK_DEBUG) console.log(`--- raw model reply ---\n${out.text}\n-----------------------\n`);
    return out;
  };
  const judge = process.env.JEV === "off" ? null : getJevJudge();
  const result = await ask(question, { run, generate, ...(judge ? { classify: createIntentClassifier(judge) } : {}) });
  console.log(`JEV intent : ${result.intent ? `${result.intent.intent} (${Math.round(result.intent.confidence * 100)}%)` : judge ? "(no answer, fell back)" : "(off)"}`);
  console.log(`tools used : ${result.toolsUsed.join(", ") || "(none)"}`);
  console.log(`time       : ${((Date.now() - started) / 1000).toFixed(1)} s`);
  console.log(`refused    : ${result.refused}${result.note ? `  (${result.note})` : ""}\n`);
  for (const claim of result.claims) console.log(`- ${claim.text}\n    evidence: ${claim.evidenceIds.join(", ")}`);
  if (result.refused) console.log(result.answer);
  if (result.graph) console.log(`\nsubgraph   : ${result.graph.nodes.length} nodes, ${result.graph.edges.length} relationships`);
  await driver.close();
} catch (error) {
  // Only the name/status: provider errors can echo request headers.
  const e = error as { name?: string; statusCode?: number; message?: string };
  console.error(error instanceof ConfigError ? error.message : `${e.name ?? "Error"}${e.statusCode ? ` HTTP ${e.statusCode}` : ""} -- ${String(e.message).slice(0, 200)}`);
  process.exit(1);
}
