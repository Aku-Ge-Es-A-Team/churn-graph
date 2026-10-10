import Link from "next/link";
import { ArrowUpRightIcon, MoreHorizontalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LEVEL_STYLES, formatCompactIdr, formatFullIdr } from "@/lib/ranking";
import { LEVEL_HEX } from "@/lib/dashboard";
import { SOURCE_STYLES } from "@/lib/evidence-graph";
import { routes } from "@/lib/site-config";
import type { RiskRow } from "@/types/graph";

const SCORE_MAX = 10;

/** Ring gauge for a 0–10 risk score, in the level colour. The number is printed, so colour is not the only cue. */
function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = Math.min(1, Math.max(0, score / SCORE_MAX)) * c;
  return (
    <div className="relative grid size-32 place-items-center">
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${filled} ${c}`} />
      </svg>
      <div className="text-center">
        <p className="font-heading text-3xl leading-none font-semibold tabular-nums">{score.toFixed(1)}</p>
        <p className="mt-1 text-xs text-muted-foreground">of {SCORE_MAX}</p>
      </div>
    </div>
  );
}

/** The single most at-risk account (first row of the ranking), with its score, level and three key numbers. */
export function SpotlightCard({ row }: { row: RiskRow }) {
  return (
    <Card className="h-full gap-0 rounded-2xl py-0 shadow-xs">
      <div className="flex items-center justify-between gap-2 px-5 pt-5">
        <h2 className="text-base font-semibold">Most at risk</h2>
        <Link
          href={routes.account(row.account)}
          aria-label={`Open ${row.account} ${row.name}`}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowUpRightIcon className="size-4" />
        </Link>
      </div>
      <div className="flex flex-1 flex-col items-center gap-3 px-5 py-5 text-center">
        <ScoreRing score={row.score} color={LEVEL_HEX[row.level]} />
        <div className="flex flex-col items-center gap-1.5">
          <p className="font-heading text-lg leading-tight font-semibold">{row.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Badge className={LEVEL_STYLES[row.level].badge}>{row.level}</Badge>
            {row.account} · Dashboard {row.dashboard}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2 px-4 pb-5">
        {[
          { label: "Signals", value: String(row.topSignals.length) },
          { label: "Renewal", value: row.renewalDays === null ? "—" : `${row.renewalDays}d` },
          { label: "At risk", value: formatCompactIdr(row.atRiskValue).replace("Rp ", ""), title: formatFullIdr(row.atRiskValue) },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center rounded-full border bg-background px-2 py-1.5" title={s.title}>
            <dd className="text-sm font-semibold tabular-nums">{s.value}</dd>
            <dt className="text-[0.65rem] text-muted-foreground">{s.label}</dt>
          </div>
        ))}
      </dl>
    </Card>
  );
}

const SOURCES = (["crm", "interactions", "usage", "tickets", "contracts", "decisions"] as const).map((k) => SOURCE_STYLES[k]);

/** The six source systems behind the graph, as overlapping chips (the "trackers connected" strip). */
export function SourcesStrip() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-muted px-5 py-4">
      <div>
        <p className="text-sm font-semibold">Sources connected</p>
        <p className="text-xs text-muted-foreground">{SOURCES.length} systems joined into one graph</p>
      </div>
      <div className="flex items-center gap-3">
        <ul className="flex -space-x-2" aria-label="Connected sources">
          {SOURCES.map((s) => (
            <li
              key={s.label}
              title={s.label}
              className="grid size-9 place-items-center rounded-full border-2 border-muted bg-card text-[0.65rem] font-semibold"
              style={{ color: s.color }}
            >
              <span aria-hidden>{s.label.slice(0, 2).toUpperCase()}</span>
              <span className="sr-only">{s.label}</span>
            </li>
          ))}
        </ul>
        <MoreHorizontalIcon className="size-4 text-muted-foreground" aria-hidden />
      </div>
    </div>
  );
}
