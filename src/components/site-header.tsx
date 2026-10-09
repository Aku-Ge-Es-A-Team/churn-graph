"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

/** Header title from the path: /dashboard → "Risk radar", /accounts/C01 → "Account C01". */
export function pageTitle(pathname: string): string {
  if (pathname.startsWith("/accounts/")) return `Account ${decodeURIComponent(pathname.split("/")[2] ?? "")}`.trim()
  if (pathname === "/dashboard") return "Risk radar"
  return "Churn Graph"
}

function PageTitle() {
  return <>{pageTitle(usePathname())}</>
}

/** Site header from the shadcn dashboard-01 template. The title reads the pathname inside Suspense (cacheComponents). */
export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
        <h1 className="text-base font-medium">
          <Suspense fallback="Churn Graph">
            <PageTitle />
          </Suspense>
        </h1>
      </div>
    </header>
  )
}
