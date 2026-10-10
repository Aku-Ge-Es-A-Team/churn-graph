import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { RankingBoard } from "@/components/ranking/ranking-board";
import { getRanking } from "@/server/queries";

export const metadata: Metadata = { title: "All accounts" };

// /accounts: the full F-11 ranking table (search, level filter, pages). `?q=` comes from the dashboard search box. The dashboard shows only the top five.
async function AccountsContent({ searchParams }: { searchParams: PageProps<"/accounts">["searchParams"] }) {
  await connection();
  const [rows, params] = await Promise.all([getRanking(), searchParams]);
  const q = typeof params.q === "string" ? params.q : "";
  return <RankingBoard rows={rows} initialQuery={q} />;
}

export default function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  return (
    <main className="flex w-full flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">All accounts</h1>
        <p className="text-sm text-muted-foreground">Every customer account ranked by churn risk. Open a row to see why.</p>
      </header>
      <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-2xl border bg-muted/30" role="status" aria-label="Loading the accounts" />}>
        <AccountsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
