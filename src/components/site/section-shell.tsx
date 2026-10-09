import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Kontainer lebar dan gutter yang sama untuk semua section landing page. */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-12", className)}>{children}</div>;
}

type SectionShellProps = {
  id?: string;
  labelledBy?: string;
  tone?: "paper" | "umber";
  className?: string;
  children: ReactNode;
};

/** Section landing page: jarak vertikal seragam dan dua nada latar (terang/gelap). */
export function SectionShell({ id, labelledBy, tone = "paper", className, children }: SectionShellProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "scroll-mt-24 py-20 md:py-28",
        tone === "umber" ? "bg-umber text-paper" : "bg-paper text-ink",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Label kecil di atas pernyataan section, dipakai hemat (satu per section). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[0.78rem] text-graphite", className)}>{children}</p>;
}
