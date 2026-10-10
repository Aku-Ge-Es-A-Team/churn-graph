export type NavLink = {
  href: string;
  label: string;
};

/** Semua path halaman di satu tempat. Ubah di sini, bukan di komponen. */
export const routes = {
  home: "/",
  dashboard: "/dashboard",
  ask: "/ask",
  accounts: "/accounts",
  account: (id: string) => `/accounts/${encodeURIComponent(id)}`,
} as const;

/** Id section landing page; dipakai navbar, footer, dan atribut `id` section. */
export const sectionIds = {
  about: "about",
  features: "features",
} as const;

/** Menu sidebar dashboard (template shadcn dashboard-01). Ikon dipetakan di AppSidebar. */
export const dashboardNav = {
  main: [
    { href: routes.dashboard, label: "Risk radar", icon: "radar" },
    { href: routes.accounts, label: "All accounts", icon: "accounts" },
    { href: routes.ask, label: "Ask the graph", icon: "ask" },
  ],
  secondary: [
    { href: routes.home, label: "Landing page", icon: "home" },
  ],
} as const;

/** Satu sumber untuk nama produk, navigasi, dan CTA utama di semua halaman. */
export const siteConfig = {
  name: "Churn Graph",
  description:
    "Churn Graph connects your CRM, inbox, tickets, usage, contracts and decision log into one graph, and shows where they disagree before a renewal slips.",
  landingNav: [
    { href: `#${sectionIds.about}`, label: "About" },
    { href: `#${sectionIds.features}`, label: "Features" },
    { href: routes.dashboard, label: "Dashboard" },
  ] satisfies NavLink[],
  primaryCta: { href: routes.dashboard, label: "Open the risk radar" } satisfies NavLink,
  footerColumns: [
    {
      title: "Product",
      links: [
        { href: routes.dashboard, label: "Risk radar" },
        { href: routes.account("C01"), label: "Example account" },
      ],
    },
    {
      title: "On this page",
      links: [
        { href: `#${sectionIds.about}`, label: "About" },
        { href: `#${sectionIds.features}`, label: "Features" },
      ],
    },
    {
      title: "Team",
      links: [
        { href: "https://github.com/Aku-Ge-Es-A-Team/churn-graph", label: "GitHub" },
      ],
    },
  ] satisfies { title: string; links: NavLink[] }[],
  credit: "Road to PENS Hackathon 2026. Built on the fictional KasirNusa case study data.",
} as const;
