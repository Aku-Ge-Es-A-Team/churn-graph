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

// Nama produk masih sementara (PRD A1).
export const metadata: Metadata = {
  title: { default: "Churn Early Warning Graph", template: "%s · Churn Early Warning Graph" },
  description: "Peringatan dini churn pelanggan berbasis context graph, lengkap dengan jalur bukti.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b bg-background text-foreground">
          <nav aria-label="Navigasi utama" className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-3">
            <Link href="/" className="font-semibold">
              Churn Early Warning Graph
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Peringkat risiko
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
