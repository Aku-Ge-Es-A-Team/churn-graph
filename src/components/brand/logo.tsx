import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

type Tone = "ink" | "paper" | "muted";

const TONE: Record<Tone, string> = {
  ink: "text-ink",
  paper: "text-paper",
  muted: "text-ink/20",
};

type LogoMarkProps = {
  className?: string;
  /** Warna cincin dan node utama; node yang terlepas selalu warna `signal`. */
  tone?: Tone;
  /** Isi untuk pembaca layar. Kosongkan bila mark hanya dekorasi. */
  title?: string;
};

/**
 * Mark Churn Graph: cincin "C" dari sebuah graph yang terbuka, satu node di ujungnya,
 * dan satu node merah yang terlepas lewat relasi putus-putus (akun yang menjauh).
 * Sumber SVG statis yang sama ada di `public/brand/churn-graph-mark.svg`.
 */
export function LogoMark({ className, tone = "ink", title }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8 shrink-0", TONE[tone], className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path d="M20.89 10.21A9 9 0 1 0 20.89 21.79" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M20.89 21.79 25.6 25.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="0.1 2.6" />
      <circle cx="20.89" cy="10.21" r="2.75" fill="currentColor" />
      <circle cx="27" cy="26.5" r="2.75" className="fill-signal" />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  tone?: Exclude<Tone, "muted">;
};

/** Mark + wordmark untuk navbar, footer, dan header aplikasi. */
export function Logo({ className, tone = "ink" }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", TONE[tone], className)}>
      <LogoMark tone={tone} className="size-7" />
      <span className="font-heading text-[1.2rem] font-medium tracking-[-0.01em]">{siteConfig.name}</span>
    </span>
  );
}
