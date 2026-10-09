import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The product name is provisional (PRD A1).
export const metadata: Metadata = {
  title: { default: "Churn Early Warning Graph", template: "%s · Churn Early Warning Graph" },
  description: "Early warning for customer churn built on a context graph, with an evidence path for every finding.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b bg-background text-foreground">
          <nav aria-label="Main navigation" className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-3">
            <Link href="/" className="font-semibold">
              Churn Early Warning Graph
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Risk ranking
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
