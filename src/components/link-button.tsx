import Link from "next/link";
import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LinkButtonProps = ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>;

/** Navigation that looks like a shadcn button but stays a real link (Next.js `Link`), so it keeps prefetch and history. */
export function LinkButton({ className, variant = "outline", size = "default", ...props }: LinkButtonProps) {
  return <Link data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
