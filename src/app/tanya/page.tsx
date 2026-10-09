import Link from "next/link";
import { AskPanel } from "@/components/ask/ask-panel";

export default function AskPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to the ranking
      </Link>
      <header>
        <h1 className="text-2xl font-semibold">Ask the Graph</h1>
        <p className="mt-1 text-sm text-muted-foreground">Questions are answered only from the context graph; claims without supporting records are dropped.</p>
      </header>
      <AskPanel />
    </main>
  );
}
