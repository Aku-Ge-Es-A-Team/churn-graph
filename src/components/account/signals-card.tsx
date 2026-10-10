"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { Pager } from "@/components/pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { pageOf } from "@/lib/paginate";
import { signalLabel } from "@/lib/ranking";
import type { Signal } from "@/types/graph";

const config = { weight: { label: "Weight", color: "var(--chart-2)" } } satisfies ChartConfig;

/** Facts shown on a signal card before "Show more". */
export const FACT_PREVIEW = 4;
/** Signal cards per page, and facts per page in the modal: a 3 × 2 grid. */
export const GRID_PAGE = 6;

/** Readable value of a fact: arrays joined, objects flattened, nothing left as raw JSON. */
export function factValue(v: unknown): string {
  if (Array.isArray(v)) return v.map(factValue).join(", ");
  if (v && typeof v === "object") return Object.entries(v).map(([k, x]) => `${k}: ${factValue(x)}`).join("; ");
  return String(v);
}

/** Non-empty facts of a signal as [label, value] pairs. */
export function signalFacts(s: Signal): [string, string][] {
  return Object.entries(s.facts)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => [k.replaceAll("_", " "), factValue(v)]);
}

function sortSignals(signals: Signal[]): Signal[] {
  return [...signals].sort((a, b) => b.weight - a.weight || (a.since < b.since ? -1 : 1));
}

/** Signals of an account as a bar per signal weight (what drives the score). The facts are in `SignalDetails`. */
export function SignalsCard({ signals }: { signals: Signal[] }) {
  const sorted = sortSignals(signals);
  const totalWeight = sorted.reduce((s, x) => s + x.weight, 0);
  const data = sorted.map((s) => ({ label: signalLabel(s.code), weight: s.weight }));

  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle>Signals</CardTitle>
        <CardDescription>
          {sorted.length
            ? `${sorted.length} signals from the rule engine, total weight ${totalWeight}. Longer bars weigh more in the score.`
            : "No signals were triggered, so nothing contradicts the dashboard."}
        </CardDescription>
      </CardHeader>
      {sorted.length ? (
        <CardContent className="flex flex-1 flex-col justify-center">
          <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(120, sorted.length * 56) }}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 32 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" dataKey="weight" allowDecimals={false} hide />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={170} tick={{ fontSize: 12 }} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="weight" fill="var(--color-weight)" radius={6} barSize={26} isAnimationActive={false}>
                <LabelList dataKey="weight" position="right" className="fill-foreground" fontSize={12} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      ) : null}
    </Card>
  );
}

function FactList({ facts }: { facts: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
      {facts.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="truncate font-medium" title={v}>
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Modal with every fact of one signal, 6 per page (3 × 2) with prev / next. Closes with the X, Escape or the backdrop. */
function SignalFactsDialog({ signal, open, onOpenChange }: { signal: Signal; open: boolean; onOpenChange: (open: boolean) => void }) {
  const facts = signalFacts(signal);
  const [page, setPage] = useState(0);
  const view = pageOf(facts, page, GRID_PAGE);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setPage(0);
      }}
    >
      <DialogContent className="gap-5 p-6 sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
            {signalLabel(signal.code)}
            <Badge className="bg-muted text-foreground">weight {signal.weight}</Badge>
          </DialogTitle>
          <DialogDescription>
            Since <time dateTime={signal.since}>{signal.since}</time> · {facts.length} facts · {signal.evidenceIds.length} evidence nodes
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {view.items.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1 rounded-lg border bg-card p-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-sm font-medium break-words">{v}</dd>
            </div>
          ))}
        </dl>
        <Pager page={view.page} pages={view.pages} onChange={setPage} label={`${signalLabel(signal.code)} facts pages`} />
      </DialogContent>
    </Dialog>
  );
}

function SignalDetailCard({ signal }: { signal: Signal }) {
  const [open, setOpen] = useState(false);
  const facts = signalFacts(signal);
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{signalLabel(signal.code)}</h3>
        <Badge className="bg-muted text-foreground">weight {signal.weight}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Since <time dateTime={signal.since}>{signal.since}</time> · {signal.evidenceIds.length} evidence nodes
      </p>
      <FactList facts={facts.slice(0, FACT_PREVIEW)} />
      {facts.length > FACT_PREVIEW ? (
        <div className="mt-auto pt-1">
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Show more ({facts.length - FACT_PREVIEW})
          </Button>
          <SignalFactsDialog signal={signal} open={open} onOpenChange={setOpen} />
        </div>
      ) : null}
    </li>
  );
}

/** What each signal is based on: one compact card per signal (4 facts, the rest in a modal), 6 cards per page. */
export function SignalDetails({ signals }: { signals: Signal[] }) {
  const sorted = sortSignals(signals);
  const [page, setPage] = useState(0);
  const view = pageOf(sorted, page, GRID_PAGE);
  if (sorted.length === 0) return null;
  return (
    <section aria-labelledby="signal-details-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="signal-details-title" className="text-lg font-semibold">
            Signal details
          </h2>
          <p className="text-sm text-muted-foreground">The facts in the graph behind each signal.</p>
        </div>
        <Pager page={view.page} pages={view.pages} onChange={setPage} label="Signal detail pages" />
      </div>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {view.items.map((s) => (
          <SignalDetailCard key={`${s.code}-${s.since}`} signal={s} />
        ))}
      </ul>
    </section>
  );
}
