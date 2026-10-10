// F-14 page helpers (T13-07): pure, no React. Evidence chips link to the account page when the ID is an account.
import type { AskStatus } from "@/types/graph";

const ACCOUNT_ID = /^[CP]\d{2}$/;

/** Account IDs (C01, P01) open the account page; other node IDs stay plain chips. */
export function evidenceHref(id: string, accountRoute: (id: string) => string): string | null {
  return ACCOUNT_ID.test(id) && id.startsWith("C") ? accountRoute(id) : null;
}

/** Short status line shown above an answer. */
export function statusCopy(status: AskStatus): { title: string; tone: "ok" | "warn" | "error" } {
  switch (status) {
    case "ok":
      return { title: "Answered from the graph", tone: "ok" };
    case "partial":
      return { title: "Partly answered: some claims had no evidence and were removed", tone: "warn" };
    case "refused":
      return { title: "This question is outside what the graph can answer", tone: "warn" };
    case "failed":
      return { title: "The answer could not be produced right now", tone: "error" };
  }
}

/** All evidence IDs cited by the claims, without duplicates, in order of appearance. */
export function citedIds(claims: { evidenceIds: string[] }[]): string[] {
  return [...new Set(claims.flatMap((c) => c.evidenceIds))];
}
