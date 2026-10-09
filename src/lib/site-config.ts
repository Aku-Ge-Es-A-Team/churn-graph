export type NavLink = {
  href: string;
  label: string;
};

/** Satu sumber untuk nama produk, tautan navbar, dan CTA utama di semua halaman. */
export const siteConfig = {
  name: "Churn Graph",
  description:
    "Churn Graph connects your CRM, inbox, tickets, usage, contracts and decision log into one graph, and shows where they disagree before a renewal slips.",
  landingHref: "/landing",
  landingNav: [
    { href: "#problem", label: "Problem" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#features", label: "Features" },
    { href: "#case-study", label: "Case study" },
  ] satisfies NavLink[],
  primaryCta: { href: "/", label: "Open the radar" } satisfies NavLink,
} as const;
