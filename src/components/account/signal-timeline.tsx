import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signalLabel } from "@/lib/ranking";
import { buildTimeline, factsSummary, renewalOffsetLabel } from "@/lib/timeline";
import type { Signal } from "@/types/graph";

/** F-19: static vertical timeline of when each signal first appeared, with its distance to the renewal date. */
export function SignalTimeline({ signals, renewalDate }: { signals: Signal[]; renewalDate: string | null }) {
  const items = buildTimeline(signals, renewalDate);
  const first = items[0];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Signal timeline</CardTitle>
        <CardDescription>
          {items.length === 0
            ? "No signals for this account, so its sources are consistent."
            : first?.daysBeforeRenewal !== null && first.daysBeforeRenewal > 0
              ? `The first signal appeared ${renewalOffsetLabel(first.daysBeforeRenewal)}${renewalDate ? ` (renewal ${renewalDate})` : ""}.`
              : "When each signal first appeared."}
        </CardDescription>
      </CardHeader>
      {items.length > 0 ? (
        <CardContent>
          <ol className="relative ml-2 border-l pl-6">
            {items.map((item) => {
              const offset = renewalOffsetLabel(item.daysBeforeRenewal);
              return (
                <li key={item.code} className="relative pb-6 last:pb-0">
                  <span aria-hidden className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-background bg-foreground" />
                  <div className="flex flex-wrap items-center gap-2">
                    <time dateTime={item.since} className="font-medium tabular-nums">
                      {item.since}
                    </time>
                    {offset ? <Badge className="bg-muted text-foreground">{offset}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm">{signalLabel(item.code)}</p>
                  {factsSummary(item.facts).length ? (
                    <ul className="mt-1 text-xs text-muted-foreground">
                      {factsSummary(item.facts).map((f) => (
                        <li key={f} className="break-words">
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </CardContent>
      ) : null}
    </Card>
  );
}
