"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { UsageComparison, UsageMetrics } from "@/server/queries/usage";

type Metric = keyof UsageMetrics;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym} ${ym.slice(2, 4)}`;

function MetricChart({ data, metric, title, releaseMonth, releaseLabel, config }: {
  data: UsageComparison["points"];
  metric: Metric;
  title: string;
  releaseMonth: string;
  releaseLabel: string;
  config: ChartConfig;
}) {
  const rows = data.map((p) => ({ month: p.month, affected: p.affected[metric], control: p.control[metric] }));
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
        <LineChart data={rows} margin={{ left: 4, right: 16, top: 16 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={monthLabel} minTickGap={16} />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => monthLabel(String(v))} />} />
          <ReferenceLine x={releaseMonth} stroke="var(--destructive)" strokeDasharray="4 4" label={{ value: releaseLabel, position: "insideTopRight", fontSize: 11, fill: "var(--destructive)" }} />
          {/* connectNulls is off: a null month is a gap, not a drop to 0. Lines differ by dash as well as colour. */}
          <Line dataKey="affected" type="monotone" stroke="var(--color-affected)" strokeWidth={2.5} dot={false} connectNulls={false} />
          <Line dataKey="control" type="monotone" stroke="var(--color-control)" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls={false} />
          <ChartLegend content={<ChartLegendContent />} />
        </LineChart>
      </ChartContainer>
    </figure>
  );
}

/** F-18: usage of the affected outlets vs the control outlets around the release that coincides with the anomaly. */
export function UsageChart({ comparison }: { comparison: UsageComparison }) {
  const { release, affectedCount, controlCount, points } = comparison;
  const config = {
    affected: { label: `Affected outlets on ${release.version} (n=${affectedCount})`, color: "var(--chart-1)" },
    control: { label: `Control: offline outlets without ${release.version} (n=${controlCount})`, color: "var(--muted-foreground)" },
  } satisfies ChartConfig;
  const releaseMonth = release.date.slice(0, 7);
  const releaseLabel = `Release ${release.version} · ${release.date}`;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Usage vs release {release.version}</CardTitle>
        <CardDescription>
          Average per outlet per day. If only the outlets on {release.version} drop while the control group stays flat, the
          drop points to a bug, not churn.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <MetricChart data={points} metric="transactions" title="Transactions recorded" releaseMonth={releaseMonth} releaseLabel={releaseLabel} config={config} />
        <MetricChart data={points} metric="offlineSynced" title="Offline transactions synced" releaseMonth={releaseMonth} releaseLabel={releaseLabel} config={config} />
        <p className="text-xs text-muted-foreground">Source: UsageBulan (monthly aggregate), not daily data. Gaps mean no data that month.</p>
      </CardContent>
    </Card>
  );
}
