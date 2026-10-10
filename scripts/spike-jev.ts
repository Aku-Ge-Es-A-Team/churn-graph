// Smoke test for the JEV AI (TypeSafe) credentials: one yes/no question. Usage: bun scripts/spike-jev.ts
import { getJevJudge } from "../src/server/ai/jev";

const judge = getJevJudge();
if (!judge) {
  console.error("TYPESAFE_API_KEY is not set in .env.local");
  process.exit(1);
}
const started = Date.now();
const answers = await judge("The champion left the company and our emails to the account are unanswered.", {
  at_risk: { type: "noul", instructions: "Does this message suggest the customer is at risk of churning?" },
});
console.log(answers ? `OK in ${Date.now() - started} ms:` : "FAILED (see the log line above)", answers ? JSON.stringify(answers) : "");
process.exit(answers ? 0 : 1);
