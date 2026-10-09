import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LEVEL_STYLES, formatCompactIdr, formatFullIdr } from "@/lib/ranking"
import { summarizeRisk, summarySentence } from "@/lib/risk-summary"
import { P_BY_LEVEL, type Level, type RiskRow } from "@/types/graph"

/**
 * Summary cards from the shadcn dashboard-01 template, filled with F-24 (PRD §6): accounts per level and the total
 * revenue at risk. Every number comes from the same F-05 RiskRow[] as the ranking table.
 */
export function SectionCards({ rows }: { rows: RiskRow[] }) {
  const s = summarizeRisk(rows)
  const count = (level: Level) => s.byLevel.find((l) => l.level === level)?.count ?? 0

  return (
    <section aria-label="Risk summary" className="flex flex-col gap-3 px-4 lg:px-6">
      <p className="text-sm text-muted-foreground">{summarySentence(s)}</p>
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Accounts needing attention</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {s.needAttention} <span className="text-base font-normal text-muted-foreground">of {s.accounts}</span>
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="font-medium">Critical, High or Watch</div>
            <div className="text-muted-foreground">{count("Safe")} accounts are Safe</div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Critical and High</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {count("Critical") + count("High")}
            </CardTitle>
            <CardAction className="flex flex-col items-end gap-1">
              <Badge className={LEVEL_STYLES.Critical.badge}>Critical {count("Critical")}</Badge>
              <Badge className={LEVEL_STYLES.High.badge}>High {count("High")}</Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="font-medium">Act on these before renewal</div>
            <div className="text-muted-foreground">Watch: {count("Watch")}</div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Revenue at risk (estimate)</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl" title={formatFullIdr(s.atRiskTotal)}>
              {formatCompactIdr(s.atRiskTotal)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="font-medium">Annual value × p, accounts above Safe</div>
            <div className="text-muted-foreground">
              p = {P_BY_LEVEL.Critical} / {P_BY_LEVEL.High} / {P_BY_LEVEL.Watch} (assumption A15)
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Annual value in these accounts</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl" title={formatFullIdr(s.annualValueNeedingAttention)}>
              {formatCompactIdr(s.annualValueNeedingAttention)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="font-medium">Contract value under review</div>
            <div className="text-muted-foreground">of {formatCompactIdr(s.annualValueTotal)} total annual value</div>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}
