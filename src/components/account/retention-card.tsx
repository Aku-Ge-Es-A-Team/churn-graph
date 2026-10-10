"use client";

import { useState } from "react";
import { Cell, Label, Pie, PieChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ActionApprovalControls } from "@/components/account/action-approval";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCompactIdr, formatFullIdr } from "@/lib/ranking";
import { checkDiscountProposal } from "@/server/queries/precedents";
import type { DecisionPrecedent, DiscountPolicy, RetentionAction, RetentionCard, RetentionJudgement } from "@/types/graph";

const DISCOUNT_FIT_WARNING = 0.3;

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
        <p role="status" className={check.deviates ? "mt-1 font-medium text-destructive" : "mt-1 text-[#3f7d57] dark:text-emerald-400"}>
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
      <ChartContainer config={config} className="aspect-square h-[150px] w-[150px]">
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
          <Pie data={slices} dataKey="value" nameKey="key" innerRadius={46} outerRadius={66} strokeWidth={3} stroke="var(--card)" isAnimationActive={false}>
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

const OUTCOME_STYLE: Record<string, string> = {
  Approved: "bg-[#3f7d57] text-white",
  Rejected: "bg-[#b8352a] text-white",
};

/** One past decision as a fixed-height mini card, so the list always shows exactly three before scrolling. */
function PrecedentItem({ p }: { p: DecisionPrecedent }) {
  return (
    <li className="flex h-26 shrink-0 flex-col gap-1 overflow-hidden rounded-lg border bg-background p-2.5 text-xs" data-precedent={p.decisionId}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{p.decisionId}</span>
        <Badge className={OUTCOME_STYLE[p.outcome] ?? "bg-muted text-foreground"}>{p.outcome}</Badge>
      </div>
      <p className="truncate text-muted-foreground">
        {p.type.replace("_", " ")} · {p.date}
        {p.value ? ` · ${p.value}` : ""}
        {p.fit !== undefined ? ` · JEV fit ${p.fit.toFixed(2)}` : ""}
      </p>
      <p className="truncate">
        {p.approver ? `${p.approver.name} (${p.approver.title})` : "No approver recorded"}
        {p.accountId ? ` · account ${p.accountId}` : ""}
      </p>
      {p.reason ? (
        <p className="line-clamp-1 text-muted-foreground" title={p.reason}>
          {p.reason}
        </p>
      ) : null}
    </li>
  );
}

/** Past approved / rejected decisions for an action: three visible, the rest scroll (scrollbar hidden, keyboard scrollable). */
function PrecedentList({ precedents, title }: { precedents: DecisionPrecedent[]; title: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Past decisions</h4>
        <span className="text-xs text-muted-foreground">{precedents.length} in the decision log</span>
      </div>
      {precedents.length > 0 ? (
        <ul
          tabIndex={0}
          aria-label={`Past decisions for ${title}`}
          className="scrollbar-none flex max-h-[20.5rem] flex-col gap-2 overflow-y-auto rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {precedents.map((p) => (
            <PrecedentItem key={p.decisionId} p={p} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No matching precedent in the decision log.</p>
      )}
      {precedents.length > 3 ? <p className="text-xs text-muted-foreground">Scroll for {precedents.length - 3} more.</p> : null}
    </div>
  );
}

/** One action: the proposal and decision form on the left, its past decisions on the right. */
function ActionCard({ action, card, primary }: { action: RetentionAction; card: RetentionCard; primary: boolean }) {
  const share = action.cost && card.atRiskValue > 0 ? (action.cost.amount / card.atRiskValue) * 100 : null;
  const donut = action.discount ? <DiscountDonut policy={action.discount} /> : action.cost ? <CostDonut cost={action.cost.amount} atRisk={card.atRiskValue} /> : null;
  return (
    <Card size="sm" aria-label={action.title} data-action={action.type}>
      <CardContent className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {primary ? <Badge className="bg-foreground text-background">Recommended</Badge> : <Badge className="bg-muted text-foreground">Also consider</Badge>}
            {action.urgency !== undefined ? (
              <Badge className="bg-muted text-foreground" data-testid="jev-urgency">
                JEV urgency {action.urgency.toFixed(1)}/3
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-heading text-base font-semibold">{action.title}</h3>
            <p className="text-sm text-muted-foreground">{action.rationale}</p>
            <p className="text-xs text-muted-foreground">Triggered by: {action.signalCodes.join(", ")}</p>
          </div>

          {donut || action.cost || action.discount ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              {donut ? <div className="shrink-0">{donut}</div> : null}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {action.cost ? (
                  <p className="text-xs" data-testid="cost-vs-risk">
                    Estimated cost <b>{formatFullIdr(action.cost.amount)}</b> ({action.cost.basis}) vs at-risk value <b>{formatFullIdr(card.atRiskValue)}</b> (estimate, p = {card.p})
                    {share !== null ? ` — cost is ${share.toFixed(0)}% of the value at risk` : ""}.
                  </p>
                ) : null}
                {action.discount ? <DiscountTester policy={action.discount} /> : null}
              </div>
            </div>
          ) : null}

          <ActionApprovalControls account={card.account} actionType={action.type} />
        </div>

        <PrecedentList precedents={action.precedents} title={action.title} />
      </CardContent>
    </Card>
  );
}

/** JEV AI verdict on the card (Adrian, F-09): confidence, reordering, review flag and discount fit. */
function JudgementNote({ judgement }: { judgement: RetentionJudgement }) {
  const lowDiscountFit = judgement.discountSuitability !== null && judgement.discountSuitability < DISCOUNT_FIT_WARNING;
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-3 text-xs" data-testid="jev-note">
      <p>
        <b>JEV AI judgement</b>
        {judgement.confidence !== null ? ` · first-action confidence ${Math.round(judgement.confidence * 100)}%` : ""}
        {judgement.reordered ? " · JEV moved a different action to the top" : ""}
      </p>
      {judgement.needsReview ? <p className="font-medium text-destructive">Needs review: JEV was not confident about the order, so the rule order is kept.</p> : null}
      {lowDiscountFit ? <p className="font-medium">JEV: a retention discount is not a fitting response here (suitability {judgement.discountSuitability!.toFixed(2)}); the cause is not price.</p> : null}
    </div>
  );
}

/**
 * F-09: retention actions with precedent, approver, cost vs value at risk and the discount deviation check.
 * Layout: one full-width card per action; proposal + decision form left, past decisions right.
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
      {card.judgement ? <JudgementNote judgement={card.judgement} /> : null}
      {card.actions.length === 0 ? (
        <Card size="sm">
          <CardContent>
            <p className="text-sm text-muted-foreground">No action is recommended: the account is {card.level === "Safe" ? "Safe" : "without a mapped action"}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {card.actions.map((a, i) => (
            <ActionCard key={a.type} action={a} card={card} primary={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}
