import { Suspense } from "react";
import { connection } from "next/server";
import { SectionCards } from "@/components/section-cards";
import { RankingBoard } from "@/components/ranking/ranking-board";
import { getRanking } from "@/server/queries";

// /dashboard: F-24 summary cards + F-11 ranking board, inside the shadcn dashboard-01 layout.
async function RankingContent() {
  await connection();
  const rows = await getRanking();
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <SectionCards rows={rows} />
      </div>
      <div className="px-4 lg:px-6">
        <RankingBoard rows={rows} />
      </div>
    </div>
  );
}

function RankingFallback() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:py-6 lg:px-6" role="status" aria-label="Loading the ranking">
      <div className="grid gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl border bg-muted/30" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl border bg-muted/30" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<RankingFallback />}>
      <RankingContent />
    </Suspense>
  );
}
