"use client";

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { routes } from "@/lib/site-config";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LEVEL_STYLES, filterFocus, formatCompactIdr, formatFullIdr, legendFromRows, renewalLabel, signalLabel } from "@/lib/ranking";
import { FOCUS_ACCOUNT_IDS, type RiskRow } from "@/types/graph";

export function RankingBoard({ rows }: { rows: RiskRow[] }) {
  const [focusOnly, setFocusOnly] = useState(false);
  const visible = focusOnly ? filterFocus(rows, FOCUS_ACCOUNT_IDS) : rows;
  const legend = legendFromRows(rows);
  const divergentCount = rows.filter((r) => r.diverges).length;

  if (rows.length === 0) {
    return <p className="rounded-lg border p-8 text-center text-muted-foreground">No customer accounts were found in the graph. Run <code>bun run rebuild</code> first.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing {visible.length} of {rows.length} accounts
          </span>
          {divergentCount > 0 ? <span>· {divergentCount} where the dashboard disagrees with the findings</span> : null}
        </div>
        <Button variant={focusOnly ? "default" : "outline"} aria-pressed={focusOnly} onClick={() => setFocusOnly((v) => !v)}>
          Focus accounts (C01–C06)
        </Button>
      </div>

      <section aria-label="Legend" className="rounded-xl border bg-card p-3 text-xs text-muted-foreground shadow-xs">
        <p className="font-medium text-foreground">At-risk value is an ESTIMATE = annual contract value × p(level). p is a team assumption, not a model output.</p>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {legend.map((l) => (
            <li key={l.level}>
              {l.level}: p = {l.p} ({l.count})
            </li>
          ))}
        </ul>
      </section>

      {visible.length === 0 ? (
        <p className="rounded-lg border p-8 text-center text-muted-foreground">None of the focus accounts is present in this data.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <Table>
            <TableCaption className="sr-only">Customer accounts ranked by churn risk</TableCaption>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>#</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Dashboard vs findings</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead className="text-right">At risk (estimate)</TableHead>
                <TableHead>Top signals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.account} className={row.diverges ? LEVEL_STYLES[row.level].row : undefined} data-account={row.account}>
                  <TableCell className="tabular-nums text-muted-foreground">{rows.indexOf(row) + 1}</TableCell>
                  <TableCell>
                    <Link
                      href={routes.account(row.account)}
                      className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 h-auto max-w-full justify-start gap-1 py-1 text-left font-semibold whitespace-normal" })}
                    >
                      <span>
                        {row.account} · {row.name}
                      </span>
                      <ChevronRightIcon className="text-muted-foreground" />
                    </Link>
                    <div className="text-xs text-muted-foreground">score {row.score.toFixed(2)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={LEVEL_STYLES[row.level].badge}>{row.level}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span aria-hidden className={`size-2 rounded-full ${row.dashboard === "Green" ? "bg-[#3f7d57]" : row.dashboard === "Yellow" ? "bg-[#d4a03f]" : "bg-[#b8352a]"}`} />
                      <span className="text-muted-foreground">Dashboard {row.dashboard}</span>
                      {row.diverges ? <Badge className="bg-foreground text-background">differs: {row.level}</Badge> : null}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{renewalLabel(row.renewalDays)}</TableCell>
                  <TableCell className="text-right tabular-nums" title={`${formatFullIdr(row.atRiskValue)} (p = ${row.p})`}>
                    {formatCompactIdr(row.atRiskValue)}
                    <div className="text-xs text-muted-foreground">of {formatCompactIdr(row.annualValue)}</div>
                  </TableCell>
                  <TableCell>
                    {row.topSignals.length ? (
                      <ul className="flex min-w-56 max-w-80 flex-wrap gap-1">
                        {row.topSignals.map((s) => (
                          <li key={`${s.code}-${s.since}`} className="rounded-md border bg-background px-1.5 py-0.5 text-xs whitespace-nowrap">
                            {signalLabel(s.code)} <span className="text-muted-foreground">w{s.weight}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-muted-foreground">No signals</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
