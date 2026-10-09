import { cn } from "@/lib/utils";

type ScrollBadgeProps = {
  /** Anchor section berikutnya. */
  href: string;
  label?: string;
  className?: string;
};

/** Lencana bundar "scroll to explore" yang berputar pelan; berhenti bila pengguna memilih reduced motion. */
export function ScrollBadge({ href, label = "Scroll to explore", className }: ScrollBadgeProps) {
  return (
    <a
      href={href}
      aria-label={label}
      className={cn("focus-ring group relative inline-flex size-24 items-center justify-center rounded-full bg-ink text-paper", className)}
    >
      <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 size-full motion-safe:animate-[spin_18s_linear_infinite]">
        <defs>
          <path id="scroll-badge-circle" d="M50 50 m-37 0 a37 37 0 1 1 74 0 a37 37 0 1 1 -74 0" />
        </defs>
        <text fontSize="10.5" letterSpacing="2.2" fill="currentColor" className="font-serif italic">
          <textPath href="#scroll-badge-circle">{`${label} • ${label} •`}</textPath>
        </text>
      </svg>
      <svg viewBox="0 0 24 24" aria-hidden className="relative size-6 transition-transform group-hover:translate-y-0.5">
        <path d="M12 4v15m0 0-6-6m6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
