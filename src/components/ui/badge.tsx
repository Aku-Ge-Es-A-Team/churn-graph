import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2 text-xs font-medium whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
