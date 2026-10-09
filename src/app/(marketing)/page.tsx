import type { Metadata } from "next";
import { LandingHero } from "@/components/site/landing-hero";
import { SiteNavbar } from "@/components/site/site-navbar";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name}: see churn before the renewal` },
  description: siteConfig.description,
};

// Landing page di `/` (keputusan Tegar 2026-10-10). Radar F-11 pindah ke `/dashboard`.
export default function LandingPage() {
  return (
    <div className="min-h-full bg-paper text-ink">
      <SiteNavbar />
      <main>
        <LandingHero />
      </main>
    </div>
  );
}
