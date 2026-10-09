import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { siteConfig, type NavLink } from "@/lib/site-config";

type SiteNavbarProps = {
  /** Tautan tengah. Default: navigasi landing page. */
  links?: readonly NavLink[];
  /** Tombol kanan. `null` untuk menyembunyikan. */
  cta?: NavLink | null;
  /** Tujuan klik logo. */
  homeHref?: string;
  className?: string;
};

/**
 * Navbar situs yang bisa dipakai ulang: logo kiri, tautan di tengah, CTA bersudut miring di kanan.
 * Di layar kecil tautan dilipat ke menu `<details>` tanpa JavaScript.
 */
export function SiteNavbar({
  links = siteConfig.landingNav,
  cta = siteConfig.primaryCta,
  homeHref = siteConfig.landingHref,
  className,
}: SiteNavbarProps) {
  return (
    <header className={cn("relative z-20 bg-paper", className)}>
      <nav
        aria-label="Main"
        className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto] items-center gap-6 px-5 md:grid-cols-[1fr_auto_1fr] md:px-10"
      >
        <Link href={homeHref} aria-label={`${siteConfig.name} home`} className="focus-ring justify-self-start rounded-sm">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-12 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <NavAnchor link={link} className="text-[0.95rem] text-ink/70 transition-colors hover:text-ink" />
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 justify-self-end">
          {cta ? <NavCta link={cta} /> : null}

          {links.length > 0 ? (
            <details className="group relative md:hidden">
              <summary className="focus-ring flex size-9 cursor-pointer list-none items-center justify-center rounded-full border border-hairline [&::-webkit-details-marker]:hidden">
                <span className="sr-only">Menu</span>
                <span aria-hidden className="flex w-4 flex-col gap-1">
                  <span className="h-px w-full bg-ink transition-transform group-open:translate-y-[2.5px] group-open:rotate-45" />
                  <span className="h-px w-full bg-ink transition-transform group-open:-translate-y-[2.5px] group-open:-rotate-45" />
                </span>
              </summary>
              <ul className="absolute right-0 top-12 flex w-52 flex-col rounded-2xl border border-hairline bg-paper p-2 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.3)]">
                {links.map((link) => (
                  <li key={link.href}>
                    <NavAnchor link={link} className="block rounded-xl px-3 py-2 text-ink hover:bg-ink/5" />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </nav>
    </header>
  );
}

/** Anchor dalam halaman memakai `<a>`; rute aplikasi memakai `Link`. */
export function NavAnchor({ link, className }: { link: NavLink; className?: string }) {
  const cls = cn("focus-ring rounded-sm", className);
  return link.href.startsWith("#") ? (
    <a href={link.href} className={cls}>
      {link.label}
    </a>
  ) : (
    <Link href={link.href} className={cls}>
      {link.label}
    </Link>
  );
}

/** CTA berbentuk jajaran genjang: potongan miring menggemakan relasi yang terputus di logo. */
export function NavCta({ link, className }: { link: NavLink; className?: string }) {
  return (
    <Link
      href={link.href}
      className={cn("focus-ring group relative inline-flex h-9 items-center px-5 text-[0.92rem] font-medium text-paper", className)}
    >
      <span aria-hidden className="absolute inset-0 -skew-x-[16deg] rounded-[5px] bg-ink transition-colors group-hover:bg-signal" />
      <span className="relative">{link.label}</span>
    </Link>
  );
}
