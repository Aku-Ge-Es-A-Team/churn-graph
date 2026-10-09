import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { siteConfig } from "@/lib/site-config";

// Header sementara area aplikasi (skeleton T00-11). Diganti template dashboard shadcn saat F-11 dikerjakan.
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b bg-background text-foreground">
        <nav aria-label="App" className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-3">
          <Link href="/" aria-label={`${siteConfig.name} risk radar`} className="focus-ring rounded-sm">
            <Logo />
          </Link>
          <Link href="/" className="focus-ring rounded-sm text-sm text-muted-foreground hover:text-foreground">
            Risk radar
          </Link>
          <Link href={siteConfig.landingHref} className="focus-ring ml-auto rounded-sm text-sm text-muted-foreground hover:text-foreground">
            About
          </Link>
        </nav>
      </header>
      {children}
    </>
  );
}
