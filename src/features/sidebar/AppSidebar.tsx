import { Link, useRouterState } from "@tanstack/react-router"
import { Plus, Search, Star } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/features/theme/ThemeToggle"
import { GithubMark } from "./GithubMark"
import { useSidebarNav } from "./useSidebarNav"

const REPO_URL = "https://github.com/Fanoflix/webfun"
const SITE_URL = "https://ammarnasir.com"

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { query, setQuery, groups, isOpen, toggle } = useSidebarNav()

  return (
    <Sidebar variant="floating" className="p-4">
      <SidebarHeader className="gap-2">
        <div className="flex items-center justify-between">
          <div className="px-1 py-1 text-sm font-semibold tracking-widest uppercase">
            webfun
          </div>
          <SidebarTrigger />
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            aria-label="Search tools"
            className="pl-8"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-2">
        {groups.map((group) => (
          <Collapsible
            key={group.label}
            open={isOpen(group.label)}
            onOpenChange={(open) => toggle(group.label, open)}
          >
            <SidebarGroup className="mx-2 w-auto rounded-lg bg-sidebar-foreground/[0.04] p-1">
              <CollapsibleTrigger className="group/trigger flex h-8 w-full items-center rounded-md px-2 text-xs font-semibold tracking-wider text-sidebar-foreground/35 uppercase transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                {group.label}
                <Plus className="ml-auto size-4 transition-transform duration-200 group-data-[panel-open]/trigger:rotate-45" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent className="pt-1">
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          isActive={pathname === item.to}
                          tooltip={item.title}
                          render={<Link to={item.to} />}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}

        {groups.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            No tools match “{query}”.
          </p>
        )}
      </SidebarContent>

      <SidebarFooter className="gap-1.5 p-1.5">
        <a
          href={SITE_URL}
          target="_blank"
          rel="noreferrer"
          className="px-1 text-xs text-muted-foreground transition-colors hover:text-sidebar-foreground"
        >
          ammarnasir.com
        </a>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 border border-sidebar-border px-2.5 py-1.5 text-xs whitespace-nowrap text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Star className="size-3.5" />
            star // contribute
            <GithubMark className="size-3.5" />
          </a>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
