import { Suspense } from "react";
import { connection } from "next/server";
import { RankingBoard } from "@/components/ranking/ranking-board";
import { getRanking } from "@/server/queries";

async function RankingContent() {
  await connection();
  const rows = await getRanking();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="max-w-3xl">
        <p className="text-sm font-medium text-primary">Data Graph · F-05 / F-11</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Churn early warning</h1>
        <p className="mt-3 text-muted-foreground">
          Ranked customer risk findings from the context graph, with renewal timing, estimated exposure, and evidence-backed signals.
        </p>
      </header>
      <RankingBoard rows={rows} />
    </main>
  );
}

function RankingFallback() {
  return <main className="mx-auto w-full max-w-6xl px-6 py-10"><div className="h-64 animate-pulse rounded-lg border bg-muted/30" /></main>;
}

export default function HomePage() {
  return <Suspense fallback={<RankingFallback />}><RankingContent /></Suspense>;
}
