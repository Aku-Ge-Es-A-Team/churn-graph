import { UsageChart } from "@/components/account/usage-chart";
import { getUsageComparison } from "@/server/queries";

/**
 * F-18 slot on the account page (T17-05). No anomaly → renders nothing (no error). A failed read shows an error in this
 * area only; the rest of the account page stays visible.
 */
export async function UsageSection({ account }: { account: string }) {
  let comparison;
  try {
    comparison = await getUsageComparison(account);
  } catch (e) {
    console.error("[account/usage] usage query failed:", e instanceof Error ? e.message : e);
    return (
      <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        The usage chart could not be loaded from the graph. The rest of this page is unaffected.
      </p>
    );
  }
  return comparison ? <UsageChart comparison={comparison} /> : null;
}

export function UsageSectionFallback() {
  return <div role="status" aria-label="Loading the usage chart" className="h-72 animate-pulse rounded-xl border bg-muted/30" />;
}
