"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVEL_STYLES, formatCompactIdr, signalLabel } from "@/lib/ranking";
import { signalKey, simulate } from "@/lib/what-if";
import type { DashboardColor, Signal } from "@/types/graph";

/**
 * F-29 (Could): what-if simulation. Turn signals off to see how score, level and value at risk would change.
 * Recomputed in the browser with the same F-05 scoring functions; nothing is saved.
 */
export function WhatIfPanel({ signals, renewalDays, annualValue, dashboard }: { signals: Signal[]; renewalDays: number | null; annualValue: number; dashboard: DashboardColor }) {
  const all = new Set(signals.map(signalKey));
  const [enabled, setEnabled] = useState<Set<string>>(all);
  const base = simulate(signals, all, { renewalDays, annualValue, dashboard });
  const now = simulate(signals, enabled, { renewalDays, annualValue, dashboard });
  const changed = enabled.size !== all.size;

  const toggle = (key: string) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle>What-if</CardTitle>
        <CardDescription>Turn a signal off to see what the account would look like if that problem were solved.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No signals to simulate.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {signals.map((s) => {
                const key = signalKey(s);
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <input type="checkbox" className="size-4 accent-foreground" checked={enabled.has(key)} onChange={() => toggle(key)} />
                        {signalLabel(s.code)}
                      </span>
                      <span className="text-xs text-muted-foreground">weight {s.weight}</span>
                    </label>
                  </li>
                );
              })}
            </ul>

            <dl className="grid grid-cols-3 gap-2 text-center" aria-live="polite">
              <div className="rounded-md bg-muted/40 p-2">
                <dt className="text-xs text-muted-foreground">Score</dt>
                <dd className="font-semibold tabular-nums">
                  {now.score.toFixed(2)}
                  {changed ? <span className="block text-xs font-normal text-muted-foreground">was {base.score.toFixed(2)}</span> : null}
                </dd>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <dt className="text-xs text-muted-foreground">Level</dt>
                <dd>
                  <Badge className={LEVEL_STYLES[now.level].badge}>{now.level}</Badge>
                  {changed ? <span className="block text-xs text-muted-foreground">was {base.level}</span> : null}
                </dd>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <dt className="text-xs text-muted-foreground">At risk</dt>
                <dd className="font-semibold tabular-nums">
                  {formatCompactIdr(now.atRisk)}
                  {changed ? <span className="block text-xs font-normal text-muted-foreground">was {formatCompactIdr(base.atRisk)}</span> : null}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Simulation only; the ranking is not changed.</p>
              <Button size="sm" variant="outline" disabled={!changed} onClick={() => setEnabled(new Set(all))}>
                Reset
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
