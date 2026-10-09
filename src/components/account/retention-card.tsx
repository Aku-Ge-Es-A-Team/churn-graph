"use client";

import { useState } from "react";
import { Cell, Label, Pie, PieChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionApprovalControls } from "@/components/account/action-approval";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
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

type Slice = { key: string; label: string; value: number; color: string };

/** Donut with a centre label. Colour is not the only cue: the legend below names each slice and its value. */
function Donut({ slices, centre, caption, unit }: { slices: Slice[]; centre: string; caption: string; unit: (v: number) => string }) {
  const config = Object.fromEntries(slices.map((s) => [s.key, { label: s.label, color: s.color }])) satisfies ChartConfig;
  return (
    <figure className="flex flex-col items-center gap-2">
      <ChartContainer config={config} className="aspect-square h-[150px]">
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
          <Pie data={slices} dataKey="value" nameKey="key" innerRadius={46} outerRadius={66} strokeWidth={3} stroke="var(--background)">
            {slices.map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
            <Label
              content={({ viewBox }) =>
                viewBox && "cx" in viewBox && "cy" in viewBox ? (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-lg font-semibold">
                      {centre}
                    </tspan>
                  </text>
                ) : null
              }
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <figcaption className="text-center text-xs text-muted-foreground">{caption}</figcaption>
      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}: <b>{unit(s.value)}</b>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Discount used vs headroom left under the precedent limit (e.g. 15% of a 15% limit = no room for more). */
function DiscountDonut({ policy }: { policy: DiscountPolicy }) {
  if (policy.currentPct === null || policy.limitPct <= 0) return null;
  const used = Math.min(policy.currentPct, policy.limitPct);
  const headroom = Math.max(0, policy.headroomPct ?? policy.limitPct - used);
  return (
    <Donut
      slices={[
        { key: "used", label: "Discount already given", value: used, color: "var(--chart-1)" },
        { key: "headroom", label: "Headroom to the limit", value: headroom, color: "var(--muted)" },
      ]}
      centre={`${used}%`}
      caption={`of the ${policy.limitPct}% precedent limit${policy.precedentId ? ` (${policy.precedentId})` : ""}`}
      unit={(v) => `${v}%`}
    />
  );
}

/** Cost of the action vs the rest of the value at risk. */
function CostDonut({ cost, atRisk }: { cost: number; atRisk: number }) {
  if (atRisk <= 0) return null;
  const share = Math.min(100, (cost / atRisk) * 100);
  return (
    <Donut
      slices={[
        { key: "cost", label: "Estimated cost", value: cost, color: "var(--chart-1)" },
        { key: "rest", label: "Rest of value at risk", value: Math.max(0, atRisk - cost), color: "var(--muted)" },
      ]}
      centre={`${share.toFixed(0)}%`}
      caption="cost as a share of the value at risk (estimate)"
      unit={formatCompactIdr}
    />
  );
}

function ActionCard({ action, card, primary }: { action: RetentionAction; card: RetentionCard; primary: boolean }) {
  const share = action.cost && card.atRiskValue > 0 ? (action.cost.amount / card.atRiskValue) * 100 : null;
  return (
    <Card size="sm" className="h-full" aria-label={action.title} data-action={action.type}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {primary ? <Badge className="bg-foreground text-background">Recommended</Badge> : <Badge className="bg-muted text-foreground">Also consider</Badge>}
        </div>
        <CardTitle className="text-base">{action.title}</CardTitle>
        <CardDescription>{action.rationale}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {action.discount ? <DiscountDonut policy={action.discount} /> : action.cost ? <CostDonut cost={action.cost.amount} atRisk={card.atRiskValue} /> : null}

        <p className="text-xs text-muted-foreground">Triggered by: {action.signalCodes.join(", ")}</p>

        {action.cost ? (
          <p className="text-xs" data-testid="cost-vs-risk">
            Estimated cost <b>{formatFullIdr(action.cost.amount)}</b> ({action.cost.basis}) vs at-risk value <b>{formatFullIdr(card.atRiskValue)}</b> (estimate, p = {card.p})
            {share !== null ? ` — cost is ${share.toFixed(0)}% of the value at risk` : ""}.
          </p>
        ) : null}

        {action.discount ? <DiscountTester policy={action.discount} /> : null}

        <ActionApprovalControls account={card.account} actionType={action.type} />

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
      </CardContent>
    </Card>
  );
}

/**
 * F-09: retention actions with precedent, approver, cost vs value at risk and the discount deviation check.
 * Layout: the recommended action and the alternatives sit side by side as separate cards, each with a donut.
 */
export function RetentionCardView({ card }: { card: RetentionCard }) {
  return (
    <section aria-labelledby="retention-title" className="flex flex-col gap-3" data-testid="retention-card">
      <div>
        <h2 id="retention-title" className="text-lg font-semibold">
          Retention actions
        </h2>
        <p className="text-sm text-muted-foreground">
          Based on past decisions. At-risk value {formatCompactIdr(card.atRiskValue)} is an estimate (annual value × p = {card.p}).
        </p>
      </div>
      {card.actions.length === 0 ? (
        <Card size="sm">
          <CardContent>
            <p className="text-sm text-muted-foreground">No action is recommended: the account is {card.level === "Safe" ? "Safe" : "without a mapped action"}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid items-stretch gap-4 md:grid-cols-2">
          {card.actions.map((a, i) => (
            <ActionCard key={a.type} action={a} card={card} primary={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}
