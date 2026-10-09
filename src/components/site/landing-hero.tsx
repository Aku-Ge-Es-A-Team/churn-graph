import { CtaLink } from "@/components/site/cta-link";
import { HeroEvidenceList, HeroGraph } from "@/components/site/hero-graph";
import { Container } from "@/components/site/section-shell";
import { siteConfig } from "@/lib/site-config";

/** Hero landing page: judul di kiri, paragraf + CTA di kanan, ilustrasi C01 selebar layar di bawahnya. */
export function LandingHero() {
  return (
    <section aria-labelledby="hero-title" className="bg-paper pt-10 text-ink md:pt-14">
      <Container className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <h1
          id="hero-title"
          className="font-heading text-[clamp(2.5rem,6vw,5.4rem)] leading-[1.02] tracking-[-0.02em] lg:col-span-7"
        >
          Find churn where your data disagrees.
        </h1>
        <div className="lg:col-span-4 lg:col-start-9 lg:pb-3">
          <p className="max-w-[40ch] text-[0.95rem] leading-[1.7] text-graphite">
            {siteConfig.name} links your CRM, email, product usage, support tickets, contracts and decision log into
            one graph, then shows the places where they contradict each other.
          </p>
          <CtaLink link={siteConfig.primaryCta} className="mt-6" />
        </div>
      </Container>

      <figure className="mt-12 bg-umber md:mt-16">
        <div className="mx-auto max-w-[1320px] px-3 py-6 sm:px-8 md:py-10 lg:px-12">
          <HeroGraph className="hidden md:block" />
          <HeroEvidenceList className="md:hidden" />
          <figcaption className="mt-4 text-[0.78rem] text-paper/50">
            Account C01 on October 1, 2026. Fictional data from the KasirNusa case study.
          </figcaption>
        </div>
      </figure>
    </section>
  );
}
