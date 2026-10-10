import type { ReactNode } from "react"
import { AlertTriangleIcon, BanknoteIcon, CircleAlertIcon, FlameIcon, WalletIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { LEVEL_STYLES, formatCompactIdr, formatFullIdr } from "@/lib/ranking"
import { summarizeRisk, summarySentence } from "@/lib/risk-summary"
import { P_BY_LEVEL, type Level, type RiskRow } from "@/types/graph"

/**
 * One summary tile. Every tile has the same skeleton (label + icon, value, optional chips, two-line footer) and the
 * same paddings, so the four line up at any width: the body grows, the footer always sits at the bottom with a
 * fixed height, and the value size is clamped between phone and desktop.
 */
export function KpiCard({
  label,
  icon,
  value,
  suffix,
  valueTitle,
  chips,
  footer,
  note,
  info,
}: {
  label: string
  icon: ReactNode
  value: string
  suffix?: string
  valueTitle?: string
  chips?: ReactNode
  footer: string
  note: string
  /** Extra explanation behind a "!" button next to the footer (hover or keyboard focus). */
  info?: ReactNode
}) {
  return (
    <Card className="h-full gap-0 rounded-2xl py-0 shadow-xs">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{label}</p>
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground [&_svg]:size-4.5">
            {icon}
          </span>
        </div>
        <p className="font-heading text-[clamp(1.75rem,1.35rem+1.2vw,2.25rem)] leading-none font-semibold tracking-tight tabular-nums" title={valueTitle}>
          {value}
          {suffix ? <span className="ml-1.5 text-base font-normal text-muted-foreground">{suffix}</span> : null}
        </p>
        <div className="flex min-h-6 flex-wrap items-center gap-1.5">{chips}</div>
      </div>
      <div className="flex min-h-[4.25rem] flex-col justify-center gap-0.5 border-t bg-muted/40 px-5 py-3 text-sm">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium" title={footer}>
            {footer}
          </p>
          {info ? (
            <Tooltip>
              <TooltipTrigger
                aria-label={`How "${label}" is calculated`}
                className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <CircleAlertIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent className="max-w-72 text-left leading-relaxed">{info}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <p className="truncate text-muted-foreground" title={note}>
          {note}
        </p>
      </div>
    </Card>
  )
}

/**
 * F-24 (PRD §6): accounts per level and the total revenue at risk, as four equal tiles.
 * Every number comes from the same F-05 RiskRow[] as the ranking table.
 */
export function SectionCards({ rows, showSentence = true }: { rows: RiskRow[]; showSentence?: boolean }) {
  const s = summarizeRisk(rows)
  const count = (level: Level) => s.byLevel.find((l) => l.level === level)?.count ?? 0

  return (
    <section aria-label="Risk summary" className="flex flex-col gap-3">
      {showSentence ? <p className="text-sm text-muted-foreground">{summarySentence(s)}</p> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 @5xl/main:grid-cols-4">
        <KpiCard
          label="Accounts needing attention"
          icon={<AlertTriangleIcon />}
          value={String(s.needAttention)}
          suffix={`of ${s.accounts}`}
          chips={<Badge className={LEVEL_STYLES.Watch.badge}>Watch {count("Watch")}</Badge>}
          footer="Critical, High or Watch"
          note={`${count("Safe")} accounts are Safe`}
        />
        <KpiCard
          label="Critical and High"
          icon={<FlameIcon />}
          value={String(count("Critical") + count("High"))}
          chips={
            <>
              <Badge className={LEVEL_STYLES.Critical.badge}>Critical {count("Critical")}</Badge>
              <Badge className={LEVEL_STYLES.High.badge}>High {count("High")}</Badge>
            </>
          }
          footer="Act on these before renewal"
          note="Highest scores in the ranking"
        />
        <KpiCard
          label="Revenue at risk (estimate)"
          icon={<WalletIcon />}
          value={formatCompactIdr(s.atRiskTotal)}
          valueTitle={formatFullIdr(s.atRiskTotal)}
          footer="Annual value × p, above Safe"
          note={`p = ${P_BY_LEVEL.Critical} / ${P_BY_LEVEL.High} / ${P_BY_LEVEL.Watch} by level`}
          info={
            <>
              Estimate, not a prediction: for every account above Safe, annual contract value × p, summed. p is a team
              assumption per level (A15): Critical {P_BY_LEVEL.Critical}, High {P_BY_LEVEL.High}, Watch {P_BY_LEVEL.Watch}. Safe
              accounts are not counted.
            </>
          }
        />
        <KpiCard
          label="Annual value in these accounts"
          icon={<BanknoteIcon />}
          value={formatCompactIdr(s.annualValueNeedingAttention)}
          valueTitle={formatFullIdr(s.annualValueNeedingAttention)}
          footer="Contract value under review"
          note={`of ${formatCompactIdr(s.annualValueTotal)} total annual value`}
        />
      </div>
    </section>
  )
}
