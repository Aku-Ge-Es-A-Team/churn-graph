"use client";

import { useSyncExternalStore } from "react";
import { CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approvalKey, decide, parseApproval, type ActionApproval } from "@/lib/action-approval";

const EVENT = "churn-graph:approval";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: ActionApproval) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked (private mode); nothing else to do.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** F-25 (Could): owner, due date and approve/reject for one retention action. Saved in this browser only (PRD: local state). */
export function ActionApprovalControls({ account, actionType }: { account: string; actionType: string }) {
  const key = approvalKey(account, actionType);
  // The raw string is the snapshot (stable between renders); the server snapshot is "nothing stored".
  const raw = useSyncExternalStore(subscribe, () => readRaw(key), () => null);
  const state = parseApproval(raw);
  const update = (next: ActionApproval) => write(key, next);

  return (
    <fieldset className="flex flex-col gap-2 rounded-md border p-2 text-xs">
      <legend className="px-1 font-medium">Decision</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Owner</span>
          <input value={state.owner} onChange={(e) => update({ ...state, owner: e.target.value })} placeholder="Who follows up" className="h-8 rounded-md border bg-background px-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Due date</span>
          <input type="date" value={state.due} onChange={(e) => update({ ...state, due: e.target.value })} className="h-8 rounded-md border bg-background px-2" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={state.decision === "approved" ? "default" : "outline"} aria-pressed={state.decision === "approved"} onClick={() => update(decide(state, "approved", new Date()))}>
          <CheckIcon />
          Approve
        </Button>
        <Button size="sm" variant={state.decision === "rejected" ? "destructive" : "outline"} aria-pressed={state.decision === "rejected"} onClick={() => update(decide(state, "rejected", new Date()))}>
          <XIcon />
          Reject
        </Button>
        <span role="status" className="text-muted-foreground">
          {state.decision === "pending" ? "Not decided yet" : `${state.decision === "approved" ? "Approved" : "Rejected"}${state.decidedAt ? ` on ${state.decidedAt.slice(0, 10)}` : ""}`}
        </span>
      </div>
      <p className="text-muted-foreground">Saved in this browser only.</p>
    </fieldset>
  );
}
