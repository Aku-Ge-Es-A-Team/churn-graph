import type { DashboardColor, RiskRow, Signal } from "../../types/graph";
import { DEFAULT_CONFIG, type ScoringConfig } from "./config";
import {
  accountScore,
  atRiskValue,
  compare,
  daysToRenewal,
  divergesFromDashboard,
  isValidWeight,
  levelFor,
  safeAmount,
  topSignals,
} from "./score";

export type AccountInfo = {
  account: string;
  name: string;
  dashboard: DashboardColor;
  annualValue: number;
  renewalDate: string | null;
};

// null (no renewal date) goes last.
const compareRenewal = (a: number | null, b: number | null) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : a - b);

// Score descending → nearest renewal → largest annual value → account id.
const compareRows = (a: RiskRow, b: RiskRow) =>
  b.score - a.score ||
  compareRenewal(a.renewalDays, b.renewalDays) ||
  safeAmount(b.annualValue) - safeAmount(a.annualValue) ||
  compare(a.account, b.account);

/** Pure: does not mutate its input. Signals of accounts that are not in `accounts` are ignored (see ignoredSignals). */
export function buildRiskRows(accounts: AccountInfo[], allSignals: Signal[], asOf: Date, cfg: ScoringConfig = DEFAULT_CONFIG): RiskRow[] {
  const byAccount = Map.groupBy(allSignals, (s) => s.account);
  return accounts
    .map((a): RiskRow => {
      const signals = byAccount.get(a.account) ?? [];
      const renewalDays = daysToRenewal(a.renewalDate, asOf);
      const score = accountScore(signals, renewalDays, cfg);
      const level = levelFor(score, cfg);
      const { p, amount } = atRiskValue(a.annualValue, level);
      return {
        account: a.account,
        name: a.name,
        dashboard: a.dashboard,
        level,
        score,
        diverges: divergesFromDashboard(a.dashboard, level),
        renewalDays,
        annualValue: a.annualValue,
        atRiskValue: amount,
        p,
        topSignals: topSignals(signals, cfg.maxTopSignals),
      };
    })
    .sort(compareRows);
}

/** Companion of buildRiskRows: signals that were not counted, for the caller to log or report. */
export function ignoredSignals(accounts: AccountInfo[], allSignals: Signal[]) {
  const known = new Set(accounts.map((a) => a.account));
  return {
    unknownAccount: allSignals.filter((s) => !known.has(s.account)),
    invalidWeight: allSignals.filter((s) => known.has(s.account) && !isValidWeight(s)),
  };
}
