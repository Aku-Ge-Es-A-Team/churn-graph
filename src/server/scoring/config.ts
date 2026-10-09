// All scoring numbers that are not fixed by the PRD. score.ts and rank.ts receive them through `cfg`.

export type RenewalTable = {
  /** Ascending by maxDays; negative days (renewal already passed) fall into the first tier. */
  tiers: { maxDays: number; factor: number }[];
  /** Factor above the last tier. */
  beyond: number;
  /** Factor when the renewal date is missing or invalid. */
  missingDate: number;
};

// From Rencana Teknis §3.4 (F06) as quoted in F-05: <=60 days 1.5, <=120 days 1.25, otherwise 1.0.
export const RENEWAL_FACTORS: RenewalTable = {
  tiers: [
    { maxDays: 60, factor: 1.5 },
    { maxDays: 120, factor: 1.25 },
  ],
  beyond: 1.0,
  missingDate: 1.0,
};

// ASSUMPTION (F-05 §9): thresholds are not in the PRD. Calibrated against the golden ranking:
// with the current signal weights C01 = 10, C04 = 6, C03 = 5, C05 = 4. High starts at 4.5, the midpoint
// between C03 (5, High) and C05 (4, Watch), so no golden account sits exactly on a boundary.
// A score below the Watch threshold is Safe.
export const LEVEL_THRESHOLDS = { Critical: 8, High: 4.5, Watch: 2 } as const;

/** Dataset snapshot date (SNAPSHOT_DATE). Only the outermost caller uses it; core functions take `asOf`. */
export const DEFAULT_REFERENCE_DATE = "2026-10-01";

export const MAX_TOP_SIGNALS = 3;

export type ScoringConfig = {
  renewalFactors: RenewalTable;
  levelThresholds: { Critical: number; High: number; Watch: number };
  maxTopSignals: number;
};

export const DEFAULT_CONFIG: ScoringConfig = {
  renewalFactors: RENEWAL_FACTORS,
  levelThresholds: LEVEL_THRESHOLDS,
  maxTopSignals: MAX_TOP_SIGNALS,
};
