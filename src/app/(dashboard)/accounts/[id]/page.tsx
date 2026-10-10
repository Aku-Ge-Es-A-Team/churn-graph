import { Suspense } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ExplanationPanel } from "@/components/account/explanation-panel";
import { RetentionCardView } from "@/components/account/retention-card";
import { SignalTimeline } from "@/components/account/signal-timeline";
import { ExportMarkdownButton } from "@/components/account/export-markdown-button";
import { SignalsCard } from "@/components/account/signals-card";
import { UsageSection, UsageSectionFallback } from "@/components/account/usage-section";
import { WhatIfPanel } from "@/components/account/what-if-panel";
import { EvidenceGraph } from "@/components/evidence/evidence-graph";
import { LinkButton } from "@/components/link-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { LEVEL_STYLES, formatCompactIdr, formatFullIdr, renewalLabel } from "@/lib/ranking";
import { routes } from "@/lib/site-config";
import { accountMarkdown, markdownFileName } from "@/lib/account-markdown";
import { addDays } from "@/lib/timeline";
import { getAccountDetail } from "@/server/queries";
import { referenceDate } from "@/server/queries/risk";

function Stat({ label, value, hint, title }: { label: string; value: string; hint?: string; title?: string }) {
  return (
    <Card className="h-full gap-1">
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums md:text-3xl" title={title}>
          {value}
        </p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
    </Card>
  );
}

// Bento layout: header, four stat tiles, signals + rule checks, retention actions side by side, evidence graph,
// timeline + usage chart. One column on phones, two on tablets, three or four on desktop.
async function AccountDetailView({ id }: { id: string }) {
  await connection();
  const detail = await getAccountDetail(id);
  if (!detail) notFound();
  const { row, signals, evidence, explanation, retention } = detail;
  const snapshot = referenceDate();
  const renewalDate = row.renewalDays === null ? null : addDays(snapshot, row.renewalDays);
  const snapshotDate = snapshot.toISOString().slice(0, 10);
  const markdown = accountMarkdown({ row, signals, explanation, retention, renewalDate, snapshotDate });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <header className="flex flex-col gap-3 lg:col-span-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
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
        <ExportMarkdownButton markdown={markdown} fileName={markdownFileName(row.account, snapshotDate)} />
      </header>

      <div className="grid grid-cols-2 gap-4 lg:col-span-3 lg:grid-cols-4">
        <Stat label="Risk score" value={row.score.toFixed(2)} hint={`Level ${row.level}`} />
        <Stat label="Renewal" value={renewalLabel(row.renewalDays)} hint={renewalDate ?? "No renewal date"} />
        <Stat label="Annual value" value={formatCompactIdr(row.annualValue)} title={formatFullIdr(row.annualValue)} hint="From the contract" />
        <Stat label="At risk (estimate)" value={formatCompactIdr(row.atRiskValue)} title={formatFullIdr(row.atRiskValue)} hint={`Annual value × p = ${row.p}`} />
      </div>

      <div className="lg:col-span-2">
        <SignalsCard signals={signals} />
      </div>
      <div className="lg:col-span-1">
        <ExplanationPanel explanation={explanation} />
      </div>

      <div className="lg:col-span-3">
        <RetentionCardView card={retention} />
      </div>

      <div className="min-w-0 lg:col-span-3">
        <EvidenceGraph account={row.account} payload={evidence} signals={signals} />
      </div>

      <div className="lg:col-span-1">
        <SignalTimeline signals={signals} renewalDate={renewalDate} />
      </div>
      <div className="lg:col-span-2">
        <WhatIfPanel signals={signals} renewalDays={row.renewalDays} annualValue={row.annualValue} dashboard={row.dashboard} />
      </div>
      <div className="min-w-0 lg:col-span-3">
        <Suspense fallback={<UsageSectionFallback />}>
          <UsageSection account={row.account} />
        </Suspense>
      </div>
    </div>
  );
}

export default function AccountPage({ params }: PageProps<"/accounts/[id]">) {
  return (
    <main className="flex w-full flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div>
        <LinkButton href={routes.dashboard} variant="outline" size="sm">
          <ArrowLeftIcon />
          Back to the ranking
        </LinkButton>
      </div>
      {/* cacheComponents: params are runtime data, so they must be read inside Suspense */}
      <Suspense fallback={<p className="text-muted-foreground">Loading the account…</p>}>
        {params.then(({ id }) => (
          <AccountDetailView id={decodeURIComponent(id)} />
        ))}
      </Suspense>
    </main>
  );
}
