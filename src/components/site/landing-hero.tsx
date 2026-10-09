import { LogoMark } from "@/components/brand/logo";
import { HeroGraph } from "@/components/site/hero-graph";
import { ScrollBadge } from "@/components/site/scroll-badge";
import { siteConfig } from "@/lib/site-config";

/** Hero landing page: wordmark raksasa, satu paragraf, dan ilustrasi kontradiksi C01. */
export function LandingHero() {
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-[1440px] px-5 pb-16 pt-6 md:px-10 md:pt-10">
      <h1
        id="hero-title"
        // Ukuran dihitung dari lebar kontainer agar wordmark selalu mengisi satu baris penuh.
        className="-ml-[0.04em] whitespace-nowrap font-heading text-[calc((100vw-2.5rem)/5.15)] leading-[0.9] font-light tracking-[-0.035em] text-ink md:text-[calc((100vw-5rem)/5.15)] min-[1440px]:text-[calc((1440px-5rem)/5.15)]"
      >
        {siteConfig.name}
      </h1>

      <div className="mt-8 grid gap-6 md:mt-10 md:grid-cols-12">
        <div className="flex gap-5 md:col-span-7 md:col-start-6 lg:col-span-6 lg:col-start-7">
          <LogoMark tone="muted" className="mt-1 hidden size-11 sm:block" />
          <p className="max-w-[56ch] text-[1.05rem] leading-[1.6] text-ink/75">
            Your health score says an account is fine. Its contacts, contracts and emails may say otherwise. Churn Graph
            links six sources into one graph and shows exactly where they disagree, months before the renewal.
          </p>
        </div>
      </div>

      <div className="relative mt-12 md:mt-16">
        <figure className="overflow-hidden rounded-[28px] bg-ink">
          <HeroGraph />
          <figcaption className="px-6 pb-5 text-[0.82rem] text-paper/45 md:px-10">
            Account C01 on October 1, 2026. Fictional data from the KasirNusa case study.
          </figcaption>
        </figure>
        <ScrollBadge href="#problem" className="absolute -top-8 right-3 size-16 md:-top-12 md:right-8 md:size-24" />
      </div>
    </section>
  );
}
