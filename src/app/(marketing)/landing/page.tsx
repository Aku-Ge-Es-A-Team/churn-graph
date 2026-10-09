import type { Metadata } from "next";
import { LandingHero } from "@/components/site/landing-hero";
import { SiteNavbar } from "@/components/site/site-navbar";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name}: see churn before the renewal` },
  description: siteConfig.description,
};

// Landing page. Rute sementara `/landing` karena `/` dikunci untuk Radar (PRD F-11); dipindah bila tim memutuskan.
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
