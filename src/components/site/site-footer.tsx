import { CtaLink } from "@/components/site/cta-link";
import { NavAnchor } from "@/components/site/site-navbar";
import { Container } from "@/components/site/section-shell";
import { siteConfig } from "@/lib/site-config";

/** Footer situs: tagline + CTA, kolom tautan, dan wordmark raksasa selebar layar. */
export function SiteFooter() {
  return (
    <footer className="overflow-hidden bg-umber text-paper">
      <Container className="pt-16 md:pt-24">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="max-w-[22ch] font-heading text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.2]">
              Early warning for every renewal, with the evidence behind it.
            </p>
            <CtaLink link={siteConfig.primaryCta} variant="light" className="mt-8" />
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-6 md:col-start-7">
            {siteConfig.footerColumns.map((col) => (
              <div key={col.title}>
                <p className="text-[0.78rem] text-paper/55">{col.title}</p>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <NavAnchor link={link} className="text-[0.9rem] text-paper/85 transition-colors hover:text-paper" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <p className="mt-16 border-t border-paper/15 pt-6 text-[0.78rem] text-paper/50 md:mt-24">{siteConfig.credit}</p>
      </Container>

      <p
        aria-hidden
        // Ukuran dari lebar layar agar wordmark Playfair selalu muat satu baris, tanpa terpotong.
        className="mt-6 select-none whitespace-nowrap pb-[2vw] text-center font-heading text-[calc((100vw-2rem)/6.6)] leading-[1] tracking-[-0.02em] text-paper"
      >
        {siteConfig.name}
      </p>
    </footer>
  );
}
