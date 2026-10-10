"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Prev / next controls with "Page x of y". Renders nothing when everything fits on one page. */
export function Pager({ page, pages, onChange, label }: { page: number; pages: number; onChange: (page: number) => void; label: string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label={label} className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onChange(page - 1)}>
        <ChevronLeftIcon />
        Prev
      </Button>
      <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
        Page {page + 1} of {pages}
      </span>
      <Button variant="outline" size="sm" disabled={page === pages - 1} onClick={() => onChange(page + 1)}>
        Next
        <ChevronRightIcon />
      </Button>
    </nav>
  );
}
