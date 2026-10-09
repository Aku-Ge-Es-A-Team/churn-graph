import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

// Ikon garis Churn Graph: grid 24, stroke 1.5, ujung bulat, satu node merah sebagai aksen bila relevan.
type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function Icon({ className, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-6 shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

/** Peringkat risiko: tiga baris berurutan, baris teratas bertanda merah. */
export function RadarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1.5" className="fill-signal stroke-signal" />
      <circle cx="4.5" cy="12" r="1.5" />
      <circle cx="4.5" cy="18" r="1.5" />
    </Icon>
  );
}

/** Jalur bukti: tiga node terhubung kiri ke kanan. */
export function PathIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="4.5" cy="12" r="2" />
      <circle cx="19.5" cy="5.5" r="2" />
      <circle cx="19.5" cy="18.5" r="2" className="fill-signal stroke-signal" />
      <path d="M6.5 12c5 0 5-6.5 11-6.5M6.5 12c5 0 5 6.5 11 6.5" />
    </Icon>
  );
}

/** Sumber A vs B: dua kartu berdampingan dengan tanda tidak sama. */
export function CompareIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="5" width="7.5" height="14" rx="1.5" />
      <rect x="14" y="5" width="7.5" height="14" rx="1.5" />
      <path d="M11 10.5h2M11 13.5h2" className="stroke-signal" />
    </Icon>
  );
}

/** Tindakan retensi berbasis preseden: centang di atas tumpukan keputusan. */
export function ActionIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 8h14M5 12.5h9M5 17h6" />
      <path d="m15 17 2 2 4-4.5" />
    </Icon>
  );
}

/** Timeline sinyal: garis waktu dengan titik pertama merah. */
export function TimelineIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12h18" />
      <circle cx="6" cy="12" r="1.8" className="fill-signal stroke-signal" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="18" cy="12" r="1.8" />
      <path d="M18 6v3M18 15v3" />
    </Icon>
  );
}

/** Tanya graph: gelembung tanya dengan node di dalamnya. */
export function AskIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 5.5h16v10H10l-4.5 3.5v-3.5H4z" />
      <circle cx="9" cy="10.5" r="1" />
      <circle cx="15" cy="10.5" r="1" className="fill-signal stroke-signal" />
      <path d="M10 10.5h4" />
    </Icon>
  );
}

/** Panah kecil untuk tautan teks. */
export function ArrowUpRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 17 17 7M9 7h8v8" />
    </Icon>
  );
}
