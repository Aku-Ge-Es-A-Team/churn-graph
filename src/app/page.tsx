import { Suspense } from "react";
import { connection } from "next/server";
import { RankingBoard } from "@/components/ranking/ranking-board";
import { getRanking } from "@/server/queries";

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading the ranking">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

// Rendered per request: the data is read from Aura (and cached by getRanking), never at build time.
async function Board() {
  await connection();
  const rows = await getRanking();
  return <RankingBoard rows={rows} />;
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Churn risk ranking</h1>
        <p className="text-sm text-muted-foreground">
          40 customer accounts ordered by score (Σ signal weight × renewal factor). Snapshot date 2026-10-01.
        </p>
      </div>
      <Suspense fallback={<BoardSkeleton />}>
        <Board />
      </Suspense>
    </main>
  );
}
