"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { LEVEL_HEX, STACK_ORDER, type RenewalMonth } from "@/lib/dashboard";

const config = Object.fromEntries(STACK_ORDER.map((l) => [l, { label: l, color: LEVEL_HEX[l] }])) satisfies ChartConfig;
const RANGES = [
  { months: 6, label: "Next 6 months" },
  { months: 12, label: "Next 12 months" },
];

/** Renewals per month, stacked by level, with the at-risk value renewing soon as the headline number. */
export function RenewalChart({ months, soonValue, soonAccounts, soonDays }: { months: RenewalMonth[]; soonValue: string; soonAccounts: number; soonDays: number }) {
  const [range, setRange] = useState(12);
  const data = months.slice(0, range);
  return (
    <section aria-labelledby="renewals-title" className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="renewals-title" className="text-xl font-semibold">
            Renewals ahead
          </h2>
          <p className="text-sm text-muted-foreground">Accounts renewing each month, coloured by risk level</p>
        </div>
        <label className="flex h-9 items-center gap-2 rounded-full border bg-card px-3 text-sm shadow-xs focus-within:ring-3 focus-within:ring-ring/50">
          <span className="text-muted-foreground">Range:</span>
          <select value={range} onChange={(e) => setRange(Number(e.target.value))} className="bg-transparent font-medium outline-none">
            {RANGES.map((r) => (
              <option key={r.months} value={r.months}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <BarChart data={data} margin={{ left: -16, right: 4, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} fontSize={12} />
          <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
          {STACK_ORDER.map((level, i) => (
            <Bar key={level} dataKey={level} stackId="renewals" fill={`var(--color-${level})`} radius={i === STACK_ORDER.length - 1 ? [6, 6, 0, 0] : 0} maxBarSize={32} isAnimationActive={false} />
          ))}
        </BarChart>
      </ChartContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {[...STACK_ORDER].reverse().map((l) => (
            <li key={l} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: LEVEL_HEX[l] }} />
              {l}
            </li>
          ))}
        </ul>
        <div className="text-right">
          <p className="font-heading text-[clamp(2rem,1.5rem+1.6vw,3rem)] leading-none font-semibold tracking-tight tabular-nums">{soonValue}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            at risk, {soonAccounts} accounts renewing within {soonDays} days (estimate)
          </p>
        </div>
      </div>
    </section>
  );
}
