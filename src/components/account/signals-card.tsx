"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { signalLabel } from "@/lib/ranking";
import type { Signal } from "@/types/graph";

const config = { weight: { label: "Weight", color: "var(--chart-2)" } } satisfies ChartConfig;

/** Readable value of a fact: arrays joined, objects flattened, nothing left as raw JSON. */
export function factValue(v: unknown): string {
  if (Array.isArray(v)) return v.map(factValue).join(", ");
  if (v && typeof v === "object") return Object.entries(v).map(([k, x]) => `${k}: ${factValue(x)}`).join("; ");
  return String(v);
}

/** Signals of an account: a bar per signal weight (what drives the score) and each signal's facts as readable fields. */
export function SignalsCard({ signals }: { signals: Signal[] }) {
  const sorted = [...signals].sort((a, b) => b.weight - a.weight || (a.since < b.since ? -1 : 1));
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
        <CardContent className="flex flex-col gap-5">
          <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(96, sorted.length * 44) }}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 32 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" dataKey="weight" allowDecimals={false} hide />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={170} tick={{ fontSize: 12 }} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="weight" fill="var(--color-weight)" radius={6} barSize={22} isAnimationActive={false}>
                <LabelList dataKey="weight" position="right" className="fill-foreground" fontSize={12} />
              </Bar>
            </BarChart>
          </ChartContainer>

          <ul className="grid gap-3 md:grid-cols-2">
            {sorted.map((s) => (
              <li key={`${s.code}-${s.since}`} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{signalLabel(s.code)}</h3>
                  <Badge className="bg-muted text-foreground">weight {s.weight}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Since <time dateTime={s.since}>{s.since}</time> · {s.evidenceIds.length} evidence nodes
                </p>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                  {Object.entries(s.facts)
                    .filter(([, v]) => v !== null && v !== undefined && v !== "")
                    .map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-muted-foreground">{k.replaceAll("_", " ")}</dt>
                        <dd className="break-words font-medium">{factValue(v)}</dd>
                      </div>
                    ))}
                </dl>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}
