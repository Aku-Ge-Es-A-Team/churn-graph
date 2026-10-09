import type { Metadata } from "next";
import { AboutSection } from "@/components/site/about-section";
import { FeaturesSection } from "@/components/site/features-section";
import { LandingHero } from "@/components/site/landing-hero";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name}: find churn where your data disagrees` },
  description: siteConfig.description,
};

// Landing page di `/` (keputusan Tegar 2026-10-10). Radar F-11 ada di `/dashboard`.
export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col bg-paper text-ink">
      <SiteNavbar />
      <main className="flex-1">
        <LandingHero />
        <AboutSection />
        <FeaturesSection />
      </main>
      <SiteFooter />
    </div>
  );
}
