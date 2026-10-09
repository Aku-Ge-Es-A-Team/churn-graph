"use client"

import { Suspense } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type NavItem = {
  title: string
  url: string
  icon?: React.ReactNode
}

/** Account detail pages belong to the risk radar. */
export function isActiveNav(url: string, pathname: string | null): boolean {
  if (!pathname) return false
  return pathname === url || (url === "/dashboard" && pathname.startsWith("/accounts/"))
}

function NavList({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton tooltip={item.title} isActive={isActiveNav(item.url, pathname)} render={<Link href={item.url} />}>
            {item.icon}
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

function ActiveNavList({ items }: { items: NavItem[] }) {
  return <NavList items={items} pathname={usePathname()} />
}

/** Main sidebar menu. The pathname is runtime data (cacheComponents), so the active state renders inside Suspense. */
export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <Suspense fallback={<NavList items={items} pathname={null} />}>
          <ActiveNavList items={items} />
        </Suspense>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
