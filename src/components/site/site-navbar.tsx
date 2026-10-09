import { Fragment } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { routes, siteConfig, type NavLink } from "@/lib/site-config";

type SiteNavbarProps = {
  /** Tautan di bawah logo. Default: navigasi landing page. */
  links?: readonly NavLink[];
  /** Tujuan klik logo. */
  homeHref?: string;
  className?: string;
};

/**
 * Navbar situs yang bisa dipakai ulang: logo di tengah, tautan di baris bawahnya dengan pemisah titik.
 * Di layar kecil tautan dilipat ke menu `<details>` tanpa JavaScript.
 */
export function SiteNavbar({ links = siteConfig.landingNav, homeHref = routes.home, className }: SiteNavbarProps) {
  return (
    <header className={cn("relative z-20 bg-paper text-ink", className)}>
      <div className="mx-auto flex max-w-[1320px] items-center justify-between px-5 pt-5 sm:px-8 md:justify-center md:pt-7 lg:px-12">
        <Link href={homeHref} aria-label={`${siteConfig.name} home`} className="focus-ring rounded-sm">
          <Logo />
        </Link>

        {links.length > 0 ? (
          <details className="group relative md:hidden">
            <summary className="focus-ring flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-hairline [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Open menu</span>
              <span aria-hidden className="flex w-4 flex-col gap-1">
                <span className="h-px w-full bg-ink transition-transform group-open:translate-y-[2.5px] group-open:rotate-45" />
                <span className="h-px w-full bg-ink transition-transform group-open:-translate-y-[2.5px] group-open:-rotate-45" />
              </span>
            </summary>
            <ul className="absolute right-0 top-12 flex w-56 flex-col border border-hairline bg-paper p-2 shadow-[0_18px_40px_-18px_rgb(42_35_29/0.45)]">
              {links.map((link) => (
                <li key={link.href}>
                  <NavAnchor link={link} className="block px-3 py-2.5 text-[0.95rem] hover:bg-sand" />
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      {links.length > 0 ? (
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center justify-center gap-7 py-5 text-[0.72rem] font-medium tracking-[0.14em] uppercase">
            {links.map((link, i) => (
              <Fragment key={link.href}>
                {i > 0 ? (
                  <li aria-hidden className="size-1 rounded-full bg-ink/40" />
                ) : null}
                <li>
                  <NavAnchor link={link} className="text-ink/80 transition-colors hover:text-ink" />
                </li>
              </Fragment>
            ))}
          </ul>
        </nav>
      ) : null}
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
