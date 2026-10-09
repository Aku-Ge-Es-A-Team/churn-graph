import type { Metadata } from "next";
import { Geist_Mono, Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

// Tipografi brand Churn Graph: judul = Playfair Display (`font-heading`), paragraf & UI = Montserrat (`font-sans`),
// kode = Geist Mono.
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased font-sans", montserrat.variable, playfair.variable, geistMono.variable)}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
