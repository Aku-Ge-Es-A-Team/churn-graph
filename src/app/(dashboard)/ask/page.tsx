import type { Metadata } from "next";
import { AskPanel } from "@/components/ask/ask-panel";
import { PRESET_QUESTIONS } from "@/server/ask/presets";

export const metadata: Metadata = { title: "Ask the graph" };

// F-14 page (PRD `/tanya`, served at /ask to match the English app routes). Talks to POST /api/ask.
export default function AskPage() {
  return (
    <main className="flex w-full flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <AskPanel presets={PRESET_QUESTIONS} />
    </main>
  );
}
