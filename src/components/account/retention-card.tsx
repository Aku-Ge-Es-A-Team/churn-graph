"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactIdr, formatFullIdr } from "@/lib/ranking";
import { checkDiscountProposal } from "@/server/queries/precedents";
import type { DiscountPolicy, RetentionAction, RetentionCard } from "@/types/graph";

function DiscountTester({ policy }: { policy: DiscountPolicy }) {
  const [value, setValue] = useState("");
  const percent = value.trim() === "" ? null : Number(value);
  const check = percent === null ? null : checkDiscountProposal(percent, policy);
  return (
    <div className="rounded-md border bg-muted/30 p-2 text-xs" data-testid="discount-tester">
      <p>
        Current discount: <b>{policy.currentPct ?? "—"}%</b> · precedent limit: <b>{policy.limitPct}%</b>
        {policy.precedentId ? ` (${policy.precedentId})` : ""} · headroom: <b>{policy.headroomPct ?? "—"}%</b>
      </p>
      <label className="mt-2 flex items-center gap-2">
        <span>Test a discount proposal (%)</span>
        <input
          type="number"
          min={0}
          max={100}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 w-20 rounded-md border bg-background px-2"
          aria-label="Discount proposal in percent"
        />
      </label>
      {check ? (
        <p role="status" className={check.deviates ? "mt-1 font-medium text-destructive" : "mt-1 text-emerald-700 dark:text-emerald-400"}>
          {check.message}
        </p>
      ) : null}
      {check?.requiresReason ? (
        <label className="mt-1 flex flex-col gap-1">
          <span>Reason (required for deviations)</span>
          <textarea className="min-h-12 rounded-md border bg-background p-1" placeholder="Why is an exception justified?" />
        </label>
      ) : null}
    </div>
  );
}

function ActionBlock({ action, card, primary }: { action: RetentionAction; card: RetentionCard; primary: boolean }) {
  const share = action.cost && card.atRiskValue > 0 ? (action.cost.amount / card.atRiskValue) * 100 : null;
  return (
    <section className="flex flex-col gap-2 rounded-lg border p-3" aria-label={action.title} data-action={action.type}>
      <div className="flex flex-wrap items-center gap-2">
        {primary ? <Badge className="bg-foreground text-background">Recommended</Badge> : <Badge className="bg-muted text-foreground">Also consider</Badge>}
        <h3 className="font-medium">{action.title}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{action.rationale}</p>
      <p className="text-xs text-muted-foreground">Triggered by: {action.signalCodes.join(", ")}</p>

      {action.cost ? (
        <p className="text-xs" data-testid="cost-vs-risk">
          Estimated cost <b>{formatFullIdr(action.cost.amount)}</b> ({action.cost.basis}) vs at-risk value <b>{formatFullIdr(card.atRiskValue)}</b> (estimate, p = {card.p})
          {share !== null ? ` — cost is ${share.toFixed(0)}% of the value at risk` : ""}.
        </p>
      ) : null}

      {action.discount ? <DiscountTester policy={action.discount} /> : null}

      {action.precedents.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {action.precedents.map((p) => (
            <li key={p.decisionId} className="rounded-md border px-2 py-1 text-xs" data-precedent={p.decisionId}>
              <span className="font-medium">{p.decisionId}</span> · {p.type.replace("_", " ")} · {p.outcome} · {p.date}
              {p.value ? ` · ${p.value}` : ""}
              <div className="text-muted-foreground">
                Approved by {p.approver ? `${p.approver.name} (${p.approver.title})` : "—"}
                {p.accountId ? ` · account ${p.accountId}` : ""}
                {p.reason ? ` · ${p.reason}` : ""}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No matching precedent in the decision log.</p>
      )}
    </section>
  );
}

/** F-09: retention actions with precedent, approver, cost vs value at risk and the discount deviation check. */
export function RetentionCardView({ card }: { card: RetentionCard }) {
  return (
    <Card size="sm" data-testid="retention-card">
      <CardHeader>
        <CardTitle>Retention actions</CardTitle>
        <CardDescription>
          Based on past decisions. At-risk value {formatCompactIdr(card.atRiskValue)} is an estimate (annual value × p = {card.p}).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {card.actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No action is recommended: the account is {card.level === "Safe" ? "Safe" : "without a mapped action"}.</p>
        ) : (
          card.actions.map((a, i) => <ActionBlock key={a.type} action={a} card={card} primary={i === 0} />)
        )}
      </CardContent>
    </Card>
  );
}
