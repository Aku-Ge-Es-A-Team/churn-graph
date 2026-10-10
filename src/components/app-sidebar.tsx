"use client"

import * as React from "react"
import Link from "next/link"
import { HouseIcon, MessageSquareTextIcon, RadarIcon, TableIcon } from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { dashboardNav, routes, siteConfig } from "@/lib/site-config"

const ICONS = {
  radar: <RadarIcon />,
  home: <HouseIcon />,
  ask: <MessageSquareTextIcon />,
  accounts: <TableIcon />,
} as const

/** Sidebar from the shadcn dashboard-01 template, filled with the Churn Graph menu (`dashboardNav` in site-config). */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href={routes.dashboard} aria-label={`${siteConfig.name} risk radar`} />}
            >
              <Logo />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={dashboardNav.main.map((i) => ({ title: i.label, url: i.href, icon: ICONS[i.icon] }))} />
        <NavSecondary
          items={dashboardNav.secondary.map((i) => ({ title: i.label, url: i.href, icon: ICONS[i.icon] }))}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <p className="px-3 pb-2 text-xs text-muted-foreground">Snapshot Oct 1, 2026. Fictional KasirNusa data.</p>
      </SidebarFooter>
    </Sidebar>
  )
}
