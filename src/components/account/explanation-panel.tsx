import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signalLabel } from "@/lib/ranking";
import type { AccountExplanation } from "@/types/graph";

/** F-07: why an account is "consistent" (or which rules fired). Generic for every account. */
export function ExplanationPanel({ explanation }: { explanation: AccountExplanation }) {
  const { status, rules, featureRequestTickets: z1 } = explanation;
  return (
    <Card size="sm" data-testid="explanation-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Rule checks
          <Badge className={status === "consistent" ? "bg-[#3f7d57] text-white" : "bg-[#b9652b] text-white"}>
            {status === "consistent" ? "Consistent" : "Findings present"}
          </Badge>
        </CardTitle>
        <CardDescription>
          {status === "consistent"
            ? "No material finding: the account is Safe because the checks below found nothing that contradicts the dashboard."
            : "These rule checks decide the level; triggered rules carry the weights."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="grid gap-1.5">
          {rules.map((r) => (
            <li key={r.code} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs">
              <span>{signalLabel(r.code)}</span>
              <span className={r.status === "triggered" ? "font-medium text-destructive" : "text-muted-foreground"}>
                {r.status === "triggered" ? `triggered (weight ${r.weight})` : "checked, clear"}
              </span>
            </li>
          ))}
        </ul>
        {z1.count > 0 ? (
          <div className="text-xs" data-testid="feature-request-tickets">
            <p className="font-medium">
              {z1.count} feature-request tickets are not counted as negative signals (rule Z1)
            </p>
            <p className="text-muted-foreground">They are product ideas from the customer, not complaints.</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {z1.titles.map((t) => (
                <li key={t.id} className="rounded border px-1.5 py-0.5" title={t.title}>
                  {t.id}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
