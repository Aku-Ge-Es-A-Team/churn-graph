import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavLink } from "@/lib/site-config";

type CtaLinkProps = {
  link: NavLink;
  /** `solid` untuk latar terang, `light` untuk latar gelap (umber). */
  variant?: "solid" | "light" | "text";
  className?: string;
};

const VARIANTS = {
  solid: "bg-ink text-paper hover:bg-signal px-5 py-3",
  light: "bg-paper text-ink hover:bg-sand px-5 py-3",
  text: "text-ink underline decoration-hairline underline-offset-[6px] hover:decoration-signal",
} as const;

/** Tombol/tautan ajakan yang dipakai ulang di hero, band statistik, dan footer. */
export function CtaLink({ link, variant = "solid", className }: CtaLinkProps) {
  const isAnchor = link.href.startsWith("#") || link.href.startsWith("http");
  const cls = cn(
    "focus-ring inline-flex items-center gap-2 rounded-[3px] text-[0.82rem] font-medium tracking-[0.02em] transition-colors",
    VARIANTS[variant],
    className,
  );
  return isAnchor ? (
    <a href={link.href} className={cls}>
      {link.label}
    </a>
  ) : (
    <Link href={link.href} className={cls}>
      {link.label}
    </Link>
  );
}
