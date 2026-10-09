import { CtaLink } from "@/components/site/cta-link";
import { ContradictionCloseup, SourcesIllustration } from "@/components/site/illustrations";
import { Container, Eyebrow, SectionShell } from "@/components/site/section-shell";
import { sectionIds, siteConfig } from "@/lib/site-config";

// Angka dari PRD: 6 sumber, 40 akun pelanggan, sinyal pertama C01 ±148 hari sebelum renewal.
const STATS = [
  { label: "Sources connected", value: "6" },
  { label: "Accounts ranked", value: "40" },
  { label: "Days of early warning on C01", value: "148" },
];

/** About: pernyataan utama, grid ilustrasi asimetris, lalu band gelap berisi angka. */
export function AboutSection() {
  return (
    <>
      <SectionShell id={sectionIds.about} labelledBy="about-title">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <Eyebrow>What it does and why</Eyebrow>
            <h2 id="about-title" className="mt-5 font-heading text-[clamp(1.6rem,3.2vw,2.6rem)] leading-[1.25]">
              Your health score reads one system. Churn risk hides between six. We connect them, show where they
              disagree, and point to what worked the last time.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:mt-24 md:grid-cols-12 md:gap-8">
            <div className="aspect-[16/15] overflow-hidden md:col-span-6">
              <SourcesIllustration />
            </div>

            <div className="flex flex-col gap-10 md:col-span-6 md:grid md:grid-cols-6 md:gap-8">
              <div className="aspect-square w-2/3 justify-self-end overflow-hidden self-end md:col-span-3 md:col-start-4 md:w-full">
                <ContradictionCloseup />
              </div>
              <div className="md:col-span-5 md:col-start-2 md:self-end">
                <h3 className="font-heading text-[1.6rem] leading-tight">Evidence, at its core.</h3>
                <p className="mt-4 text-[0.92rem] leading-[1.75] text-graphite">
                  A green dashboard can hide a champion who left, a promised feature that slipped, or a competitor
                  named in a meeting. Each fact sits in a different system, so no single report shows it.
                </p>
                <p className="mt-3 text-[0.92rem] leading-[1.75] text-graphite">
                  {siteConfig.name} keeps the file and row behind every fact, so each warning can be traced back to the
                  records that caused it.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </SectionShell>

      <section aria-labelledby="stats-title" className="bg-umber text-paper">
        <Container className="py-20 md:py-28">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-6">
              <h2 id="stats-title" className="font-heading text-[clamp(1.8rem,3.6vw,3rem)] leading-[1.1]">
                Built for the weekly retention meeting.
              </h2>
              <p className="mt-5 max-w-[46ch] text-[0.92rem] leading-[1.75] text-paper/70">
                Start from the riskiest account, open the path that explains it, and leave with an action your team
                has approved before.
              </p>
            </div>
            <div className="md:col-span-4 md:col-start-9 md:self-end">
              <CtaLink link={siteConfig.primaryCta} variant="light" />
            </div>
          </div>

          <dl className="mt-16 grid grid-cols-1 gap-10 border-t border-paper/15 pt-10 sm:grid-cols-3 md:mt-24">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="text-[0.78rem] text-paper/60">{s.label}</dt>
                <dd className="mt-2 font-heading text-[clamp(2.6rem,5vw,4rem)] leading-none">{s.value}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>
    </>
  );
}
