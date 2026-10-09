import { Badge } from "@/components/ui/badge";
import { LEVEL_STYLES, formatCompactIdr, formatFullIdr } from "@/lib/ranking";
import { summarizeRisk, summarySentence } from "@/lib/risk-summary";
import { P_BY_LEVEL, type RiskRow } from "@/types/graph";

/** F-24: one-sentence summary above the ranking board, with the level counts and the total revenue at risk. */
export function RiskSummary({ rows }: { rows: RiskRow[] }) {
  const s = summarizeRisk(rows);

  return (
    <section aria-label="Risk summary" className="grid gap-4 rounded-lg border p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-5">
      <div className="flex flex-col gap-3">
        <p className="text-base font-medium md:text-lg">{summarySentence(s)}</p>
        <ul className="flex flex-wrap gap-2" aria-label="Accounts per level">
          {s.byLevel.map(({ level, count }) => (
            <li key={level}>
              <Badge className={LEVEL_STYLES[level].badge}>
                {level}: {count}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      <dl className="flex flex-col gap-0.5 md:items-end md:text-right">
        <dt className="text-xs text-muted-foreground">Revenue at risk (estimate)</dt>
        <dd className="text-2xl font-semibold tabular-nums" title={formatFullIdr(s.atRiskTotal)}>
          {formatCompactIdr(s.atRiskTotal)}
        </dd>
        <dd className="text-xs text-muted-foreground">
          of {formatCompactIdr(s.annualValueNeedingAttention)} annual value in these accounts · p = {P_BY_LEVEL.Critical} / {P_BY_LEVEL.High} / {P_BY_LEVEL.Watch}
        </dd>
      </dl>
    </section>
  );
}
