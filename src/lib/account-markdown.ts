// F-30 (Could): export an account summary as Markdown. Pure: builds the text from the same data the page shows.
import { formatFullIdr, renewalLabel, signalLabel } from "@/lib/ranking";
import type { AccountExplanation, RetentionCard, RiskRow, Signal } from "@/types/graph";

const factLine = (v: unknown): string =>
  Array.isArray(v) ? v.map(factLine).join(", ") : v && typeof v === "object" ? JSON.stringify(v) : String(v);

export function accountMarkdown(input: {
  row: RiskRow;
  signals: Signal[];
  explanation: AccountExplanation;
  retention: RetentionCard;
  renewalDate: string | null;
  snapshotDate: string;
}): string {
  const { row, signals, explanation, retention, renewalDate, snapshotDate } = input;
  const lines: string[] = [
    `# ${row.account} · ${row.name}`,
    "",
    `Snapshot ${snapshotDate}. Fictional data from the KasirNusa case study.`,
    "",
    "## Summary",
    "",
    `- Level: **${row.level}** (dashboard: ${row.dashboard}${row.diverges ? ", diverges from the findings" : ""})`,
    `- Risk score: ${row.score.toFixed(2)}`,
    `- Renewal: ${renewalLabel(row.renewalDays)}${renewalDate ? ` (${renewalDate})` : ""}`,
    `- Annual value: ${formatFullIdr(row.annualValue)}`,
    `- At risk (estimate): ${formatFullIdr(row.atRiskValue)} (annual value × p = ${row.p})`,
    "",
    "## Signals",
    "",
  ];
  if (signals.length === 0) lines.push("No signals were triggered; the account is consistent.", "");
  for (const s of signals) {
    lines.push(`### ${signalLabel(s.code)} (weight ${s.weight}, since ${s.since})`, "");
    for (const [k, v] of Object.entries(s.facts)) if (v !== null && v !== undefined && v !== "") lines.push(`- ${k.replaceAll("_", " ")}: ${factLine(v)}`);
    lines.push(`- Evidence: ${s.evidenceIds.join(", ")}`, "");
  }
  lines.push("## Rule checks", "", `Status: ${explanation.status === "consistent" ? "consistent" : "findings present"}`, "");
  for (const r of explanation.rules) lines.push(`- ${signalLabel(r.code)}: ${r.status === "triggered" ? `triggered (weight ${r.weight})` : "checked, clear"}`);
  lines.push("", "## Retention actions", "");
  if (retention.actions.length === 0) lines.push("No action is recommended.");
  retention.actions.forEach((a, i) => {
    lines.push(`### ${i === 0 ? "Recommended" : "Also consider"}: ${a.title}`, "", a.rationale, "");
    if (a.cost) lines.push(`- Estimated cost: ${formatFullIdr(a.cost.amount)} (${a.cost.basis})`);
    for (const p of a.precedents) lines.push(`- Precedent ${p.decisionId}: ${p.type.replace("_", " ")}, ${p.outcome}, ${p.date}${p.approver ? `, approved by ${p.approver.name}` : ""}`);
    lines.push("");
  });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

export const markdownFileName = (account: string, snapshotDate: string) => `churn-graph-${account}-${snapshotDate}.md`;
