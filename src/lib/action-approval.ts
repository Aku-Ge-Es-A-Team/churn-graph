// F-25 (Could): owner, due date and approve/reject per retention action, kept in local state (PRD §6: "disimpan di
// state lokal"). Pure helpers for the storage format so the component stays thin and the format is tested.
export type Decision = "pending" | "approved" | "rejected";

export type ActionApproval = { owner: string; due: string; decision: Decision; decidedAt: string | null };

export const EMPTY_APPROVAL: ActionApproval = { owner: "", due: "", decision: "pending", decidedAt: null };

export const approvalKey = (account: string, actionType: string) => `churn-graph:approval:${account}:${actionType}`;

/** Parses a stored value; anything malformed falls back to the empty approval instead of throwing. */
export function parseApproval(raw: string | null): ActionApproval {
  if (!raw) return EMPTY_APPROVAL;
  try {
    const v = JSON.parse(raw) as Partial<ActionApproval>;
    const decision: Decision = v.decision === "approved" || v.decision === "rejected" ? v.decision : "pending";
    return {
      owner: typeof v.owner === "string" ? v.owner : "",
      due: typeof v.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.due) ? v.due : "",
      decision,
      decidedAt: decision === "pending" ? null : typeof v.decidedAt === "string" ? v.decidedAt : null,
    };
  } catch {
    return EMPTY_APPROVAL;
  }
}

/** Applies a decision; deciding again with the same value resets it to pending (toggle). */
export function decide(current: ActionApproval, decision: Exclude<Decision, "pending">, now: Date): ActionApproval {
  if (current.decision === decision) return { ...current, decision: "pending", decidedAt: null };
  return { ...current, decision, decidedAt: now.toISOString() };
}
