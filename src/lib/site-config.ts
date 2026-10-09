export type NavLink = {
  href: string;
  label: string;
};

/** Semua path halaman di satu tempat. Ubah di sini, bukan di komponen. */
export const routes = {
  home: "/",
  dashboard: "/dashboard",
  account: (id: string) => `/accounts/${encodeURIComponent(id)}`,
} as const;

/** Satu sumber untuk nama produk, tautan navbar, dan CTA utama di semua halaman. */
export const siteConfig = {
  name: "Churn Graph",
  description:
    "Churn Graph connects your CRM, inbox, tickets, usage, contracts and decision log into one graph, and shows where they disagree before a renewal slips.",
  landingNav: [
    { href: "#problem", label: "Problem" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#features", label: "Features" },
    { href: "#case-study", label: "Case study" },
  ] satisfies NavLink[],
  primaryCta: { href: routes.dashboard, label: "Open the radar" } satisfies NavLink,
} as const;
