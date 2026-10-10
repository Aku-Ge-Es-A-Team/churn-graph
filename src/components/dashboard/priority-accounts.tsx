import Link from "next/link";
import { ArrowUpRightIcon, ChevronRightIcon, ListOrderedIcon } from "lucide-react";
import { formatCompactIdr, formatFullIdr, signalLabel } from "@/lib/ranking";
import { LEVEL_HEX, type CommonSignal } from "@/lib/dashboard";
import { routes } from "@/lib/site-config";
import { addDays } from "@/lib/timeline";
import type { RiskRow } from "@/types/graph";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** The top of the ranking as a short list (renewal date, account, level, value at risk); each row opens the account. */
export function PriorityAccounts({ rows, snapshot }: { rows: RiskRow[]; snapshot: Date }) {
  return (
    <section aria-labelledby="priority-title" className="flex flex-col gap-2">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="priority-title" className="text-xl font-semibold">
          Priority accounts
        </h2>
        <span aria-hidden className="grid size-10 place-items-center rounded-full border bg-background [&_svg]:size-4.5">
          <ListOrderedIcon />
        </span>
      </div>
      <ol className="flex flex-col">
        {rows.map((r) => (
          <li key={r.account} className="border-b last:border-b-0">
            <Link
              href={routes.account(r.account)}
              className="group grid grid-cols-[5.75rem_minmax(0,1fr)_auto] items-start gap-3 rounded-lg px-1 py-4 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="text-xs leading-snug text-muted-foreground">
                {r.renewalDays === null ? "No renewal" : shortDate(addDays(snapshot, r.renewalDays))}
                <span className="block text-sm font-semibold whitespace-nowrap text-foreground tabular-nums">{r.renewalDays === null ? "—" : `in ${r.renewalDays} days`}</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{r.name}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: LEVEL_HEX[r.level] }} />
                  <span className="truncate" title={formatFullIdr(r.atRiskValue)}>
                    {r.level} · {r.account} · {formatCompactIdr(r.atRiskValue).replace("Rp ", "")}
                  </span>
                </span>
              </span>
              <ArrowUpRightIcon className="mt-0.5 size-4 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
      <Link
        href={routes.accounts}
        className="mx-auto mt-1 flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        See all accounts
        <ChevronRightIcon className="size-4" />
      </Link>
    </section>
  );
}

/** Which signals the flagged accounts share: label, bar and share of accounts above Safe. */
export function CommonSignals({ signals, flagged }: { signals: CommonSignal[]; flagged: number }) {
  return (
    <section aria-labelledby="common-signals-title" className="flex flex-col gap-5">
      <div>
        <h2 id="common-signals-title" className="text-xl font-semibold">
          Common signals
        </h2>
        <p className="text-xs text-muted-foreground">Share of the {flagged} accounts that need attention</p>
      </div>
      {signals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No signals: every account is Safe.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {signals.map((s) => {
            const pct = Math.round(s.share * 100);
            return (
              <li key={s.code} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm">{signalLabel(s.code)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {s.accounts} · {pct}%
                  </span>
                </div>
                <span className="h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${s.accounts} accounts, ${pct}%`}>
                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: LEVEL_HEX.Critical }} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
