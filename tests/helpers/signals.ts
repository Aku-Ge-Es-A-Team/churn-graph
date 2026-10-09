import type { AccountInfo } from "../../src/server/scoring/rank";
import type { Signal } from "../../src/types/graph";

/** A valid signal with sensible defaults; override only what the test cares about. */
export function signal(overrides: Partial<Signal> & Pick<Signal, "account" | "code" | "weight">): Signal {
  return { evidenceIds: [overrides.account], facts: {}, since: "2026-08-01", ...overrides };
}

export function account(overrides: Partial<AccountInfo> & Pick<AccountInfo, "account">): AccountInfo {
  return { name: `Account ${overrides.account}`, dashboard: "Green", annualValue: 100_000_000, renewalDate: "2027-06-01", ...overrides };
}

export const AS_OF = new Date("2026-10-01T00:00:00Z");
