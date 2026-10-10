// Prints the JEV AI intent for sample questions (no graph, no 9router). Usage: bun scripts/spike-intent.ts
import { getJevJudge } from "../src/server/ai/jev";
import { createIntentClassifier } from "../src/server/ask/intent";

const judge = getJevJudge();
if (!judge) {
  console.error("TYPESAFE_API_KEY is not set in .env.local");
  process.exit(1);
}
const classify = createIntentClassifier(judge);
const questions = process.argv.slice(2).length
  ? [process.argv.slice(2).join(" ")]
  : [
      "What was promised to C01, who approved it, and was it kept?",
      "Why is C01 critical while the dashboard is green?",
      "Which account is most at risk of churning, and why?",
      "Which tickets were caused by release v4.12?",
      "How is KasirPro connected to C01?",
      "What is the highest discount ever approved, by whom, and why?",
      "resep nasi goreng",
      "Write me a poem about the sea",
    ];
for (const q of questions) {
  const started = Date.now();
  const r = await classify(q);
  console.log(`${r ? `${r.intent} (${Math.round(r.confidence * 100)}%)` : "no answer"} · ${Date.now() - started} ms · ${q}`);
}
