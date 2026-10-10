import { Suspense } from "react";
import { connection } from "next/server";
import { AlertTriangleIcon, MessageSquareTextIcon, SearchIcon, WalletIcon } from "lucide-react";
import { SourcesStrip, SpotlightCard } from "@/components/dashboard/overview";
import { CommonSignals, PriorityAccounts } from "@/components/dashboard/priority-accounts";
import { RenewalChart } from "@/components/dashboard/renewal-chart";
import { KpiCard } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";
import { atRiskRenewingWithin, commonSignals, renewalsByMonth } from "@/lib/dashboard";
import { LEVEL_STYLES, formatCompactIdr, formatFullIdr } from "@/lib/ranking";
import { summarizeRisk } from "@/lib/risk-summary";
import { routes } from "@/lib/site-config";
import { getRanking } from "@/server/queries";
import { referenceDate } from "@/server/queries/risk";
import { P_BY_LEVEL, type Level } from "@/types/graph";

const SOON_DAYS = 90;
const PREVIEW = 5;

// /dashboard, laid out like the reference: main column (header + search, spotlight, two KPI tiles, sources strip,
// renewals chart) and a right column of two cards (priority accounts with "See all", common signals).
// Every number comes from the same F-05 RiskRow[]; the full F-11 table is at /accounts.
async function DashboardContent() {
  await connection();
  const rows = await getRanking();
  const snapshot = referenceDate();
  const s = summarizeRisk(rows);
  const count = (level: Level) => s.byLevel.find((l) => l.level === level)?.count ?? 0;
  const soon = atRiskRenewingWithin(rows, SOON_DAYS);
  const snapshotLabel = snapshot.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="grid flex-1 content-start grid-cols-[minmax(0,1fr)] @5xl/main:grid-cols-[minmax(0,1fr)_21rem] @7xl/main:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="@container/left flex min-w-0 flex-col gap-6 px-4 py-6 lg:gap-8 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Risk radar</h1>
            <p className="text-sm text-muted-foreground">Snapshot {snapshotLabel}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <form action={routes.accounts} role="search" className="relative">
              <label htmlFor="dashboard-search" className="sr-only">
                Search accounts
              </label>
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                id="dashboard-search"
                name="q"
                type="search"
                placeholder="Search accounts"
                className="h-10 w-44 rounded-full sm:w-56 border-0 bg-muted pr-4 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </form>
            <a
              href={routes.ask}
              aria-label="Ask the graph"
              className="grid size-10 place-items-center rounded-full border bg-card shadow-xs outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <MessageSquareTextIcon className="size-4.5" />
            </a>
          </div>
        </header>

        <div className="grid gap-4 @2xl/left:grid-cols-[15.5rem_minmax(0,1fr)] @4xl/left:grid-cols-[17rem_minmax(0,1fr)]">
          {rows[0] ? <SpotlightCard row={rows[0]} /> : null}
          <div className="grid gap-4 @md/left:grid-cols-2">
            <KpiCard
              className="bg-linear-to-br from-[#f3d9d2] via-[#f7ebe4] to-card"
              label="Accounts needing attention"
              icon={<AlertTriangleIcon />}
              value={String(s.needAttention)}
              suffix={`of ${s.accounts}`}
              chips={
                <>
                  <Badge className={LEVEL_STYLES.Critical.badge}>Critical {count("Critical")}</Badge>
                  <Badge className={LEVEL_STYLES.High.badge}>High {count("High")}</Badge>
                  <Badge className={LEVEL_STYLES.Watch.badge}>Watch {count("Watch")}</Badge>
                </>
              }
              footer="Critical, High or Watch"
              note={`${count("Safe")} accounts are Safe`}
            />
            <KpiCard
              className="bg-linear-to-br from-[#efe2c9] via-[#f5eee1] to-card"
              label="Revenue at risk (estimate)"
              icon={<WalletIcon />}
              value={formatCompactIdr(s.atRiskTotal)}
              valueTitle={formatFullIdr(s.atRiskTotal)}
              chips={<span className="text-xs text-muted-foreground">of {formatCompactIdr(s.annualValueNeedingAttention)} annual value under review</span>}
              footer="Annual value × p"
              note={`p = ${P_BY_LEVEL.Critical} / ${P_BY_LEVEL.High} / ${P_BY_LEVEL.Watch} by level`}
              info={
                <>
                  Estimate, not a prediction: for every account above Safe, annual contract value × p, summed. p is a team
                  assumption per level (A15): Critical {P_BY_LEVEL.Critical}, High {P_BY_LEVEL.High}, Watch {P_BY_LEVEL.Watch}. Safe
                  accounts are not counted.
                </>
              }
            />
            <div className="@md/left:col-span-2">
              <SourcesStrip />
            </div>
          </div>
        </div>

        <RenewalChart months={renewalsByMonth(rows, snapshot)} soonValue={formatCompactIdr(soon.value)} soonAccounts={soon.accounts} soonDays={SOON_DAYS} />
      </div>

      <aside className="flex flex-col gap-4 px-4 pb-6 lg:px-8 @5xl/main:py-6 @5xl/main:pr-8 @5xl/main:pl-0">
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <PriorityAccounts rows={rows.slice(0, PREVIEW)} snapshot={snapshot} />
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <CommonSignals signals={commonSignals(rows)} flagged={s.needAttention} />
        </div>
      </aside>
    </div>
  );
}

function DashboardFallback() {
  return (
    <div className="grid flex-1 content-start grid-cols-[minmax(0,1fr)] @5xl/main:grid-cols-[minmax(0,1fr)_21rem] @7xl/main:grid-cols-[minmax(0,1fr)_24rem]" role="status" aria-label="Loading the dashboard">
      <div className="flex flex-col gap-8 px-4 py-6 lg:px-8">
        <div className="h-12 w-72 animate-pulse rounded-xl bg-muted/60" />
        <div className="grid gap-4 @3xl/main:grid-cols-[16.5rem_minmax(0,1fr)]">
          <div className="h-80 animate-pulse rounded-2xl bg-muted/50" />
          <div className="h-80 animate-pulse rounded-2xl bg-muted/50" />
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-muted/50" />
      </div>
      <div className="m-4 min-h-96 animate-pulse rounded-2xl bg-muted/50 lg:m-8 @5xl/main:ml-0" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}
