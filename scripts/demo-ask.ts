// Manual validation helper for F-14 (read-only): ask one question end to end against Aura and the 9router LLM.
//   bun scripts/demo-ask.ts "Why is C01 critical while the dashboard is green?"
//   JEV=off bun scripts/demo-ask.ts "..."   (skip the JEV AI intent routing, for a before/after comparison)
// Uses the same pipeline as POST /api/ask (src/server/ask/ask.ts) and the same Cypher guard; it is not an endpoint.
import { getJevJudge } from "../src/server/ai/jev";
import { getLlmModel } from "../src/server/ai/provider";
import { askQuestion } from "../src/server/ask/ask";
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
  const judge = process.env.JEV === "off" ? null : getJevJudge();
  const result = await askQuestion(question, { model: getLlmModel(), run, ...(judge ? { classify: createIntentClassifier(judge) } : {}) });

  console.log(`JEV routing: ${judge ? "on" : "off"}`);
  console.log(`status     : ${result.status}`);
  console.log(`tools used : ${result.toolsCalled.join(", ") || "(none)"}`);
  console.log(`time       : ${(result.durationMs / 1000).toFixed(1)} s`);
  console.log(`discarded  : ${result.discarded}${result.note ? `  (${result.note})` : ""}\n`);
  for (const claim of result.claims) console.log(`- ${claim.text}\n    evidence: ${claim.evidenceIds.join(", ")}`);
  if (result.status === "refused" || result.status === "failed") console.log(result.answer);
  await driver.close();
} catch (error) {
  // Only the name/status: provider errors can echo request headers.
  const e = error as { name?: string; statusCode?: number; message?: string };
  console.error(error instanceof ConfigError ? error.message : `${e.name ?? "Error"}${e.statusCode ? ` HTTP ${e.statusCode}` : ""} -- ${String(e.message).slice(0, 200)}`);
  process.exit(1);
}
