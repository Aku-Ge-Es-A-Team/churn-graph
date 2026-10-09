import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ExplanationPanel } from "@/components/account/explanation-panel";
import { RetentionCardView } from "@/components/account/retention-card";
import { EvidenceGraph } from "@/components/evidence/evidence-graph";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVEL_STYLES, formatFullIdr, renewalLabel, signalLabel } from "@/lib/ranking";
import { getAccountDetail } from "@/server/queries";

async function AccountDetailView({ id }: { id: string }) {
  await connection();
  const detail = await getAccountDetail(id);
  if (!detail) notFound();
  const { row, signals, evidence, explanation, retention } = detail;

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">
            {row.account} · {row.name}
          </h1>
          <Badge className={LEVEL_STYLES[row.level].badge}>{row.level}</Badge>
          {row.diverges ? (
            <Badge className="bg-foreground text-background">
              Dashboard: {row.dashboard} vs Findings: {row.level}
            </Badge>
          ) : (
            <Badge className="bg-muted text-foreground">Dashboard: {row.dashboard}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Score {row.score.toFixed(2)} · renewal {renewalLabel(row.renewalDays)} · annual value {formatFullIdr(row.annualValue)} · at risk {formatFullIdr(row.atRiskValue)} (estimate, p = {row.p})
        </p>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Signals</CardTitle>
          <CardDescription>{signals.length ? `${signals.length} signals from the rule engine.` : "No signals were triggered."}</CardDescription>
        </CardHeader>
        {signals.length ? (
          <CardContent>
            <ul className="flex flex-col gap-2">
              {signals.map((s) => (
                <li key={`${s.code}-${s.since}`} className="rounded-md border p-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{signalLabel(s.code)}</span>
                    <span className="text-muted-foreground">
                      weight {s.weight} · since {s.since} · {s.evidenceIds.length} evidence nodes
                    </span>
                  </div>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-muted-foreground">{JSON.stringify(s.facts)}</pre>
                </li>
              ))}
            </ul>
          </CardContent>
        ) : null}
      </Card>

      <ExplanationPanel explanation={explanation} />
      <RetentionCardView card={retention} />
      <EvidenceGraph account={row.account} initialPayload={evidence} signals={signals} />
    </>
  );
}

export default function AccountPage({ params }: PageProps<"/akun/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to the ranking
      </Link>
      {/* cacheComponents: params are runtime data, so they must be read inside Suspense */}
      <Suspense fallback={<p className="text-muted-foreground">Loading the account…</p>}>
        {params.then(({ id }) => (
          <AccountDetailView id={decodeURIComponent(id)} />
        ))}
      </Suspense>
    </main>
  );
}
