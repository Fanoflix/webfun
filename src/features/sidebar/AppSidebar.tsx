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
import { SearchHint } from "./SearchHint"
import { WebfunMark } from "./WebfunMark"
import { useSidebarNav } from "./useSidebarNav"

const REPO_URL = "https://github.com/Fanoflix/webfun"
const SITE_URL = "https://ammarnasir.com"

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { query, setQuery, inputRef, groups, isOpen, toggle } = useSidebarNav()

  return (
    <Sidebar variant="floating" className="p-4">
      {/* The toggle hangs off the outside of the card rather than sitting in the
          header, so the rail's own chrome is nothing but the site and its tools.

          The zero-height `relative` anchor is what makes that possible. An
          absolutely positioned child of the card would otherwise resolve
          against the fixed container, whose `p-4` puts its edge an inch away
          from the card's; this pins to the card itself, then pushes the toggle
          its own width plus the gap clear of it. */}
      <div className="relative">
        {/* Faded out when the rail is away. It's translated clear of the card,
            so the panel sliding off-screen doesn't take it with it — it would
            otherwise be left stranded against the left edge, a toggle with
            nothing attached to it. Matches the panel's own transition so the
            two leave together. */}
        <div className="absolute top-0 right-0 translate-x-[calc(100%+0.5rem)] transition-opacity duration-100 ease-linear group-data-[state=collapsed]:pointer-events-none group-data-[state=collapsed]:opacity-0">
          <SidebarTrigger />
        </div>
      </div>

      <SidebarHeader className="gap-0.5 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-1 py-1 pb-5 text-xs font-semibold tracking-widest uppercase">
            <WebfunMark className="size-4 shrink-0" />
            webfun
          </div>
        </div>
        <div className="group relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            aria-label="Search tools"
            className="pr-12 pl-8 text-xs placeholder:text-xs"
          />
          <SearchHint
            held
            className="absolute top-1.5 right-1.5 border-transparent text-muted-foreground"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-3">
        {groups.map((group) => (
          <Collapsible
            key={group.label}
            open={isOpen(group.label)}
            onOpenChange={(open) => toggle(group.label, open)}
          >
            <SidebarGroup className="w-auto gap-0.5 p-0">
              {/* Nothing in the rail carries a background — not the category,
                  not a row, not the active one — so the tools read as a list
                  rather than a stack of chips, and the eye has one thing to
                  follow instead of three competing tints.

                  The category doesn't light up on hover at all: the cursor
                  already says it's pressable, and a heading that reacts
                  competes with the row you're actually reaching for. */}
              <CollapsibleTrigger className="group/trigger flex w-full cursor-pointer items-center px-2 py-2 text-[11px] font-bold tracking-wider text-sidebar-foreground/35 uppercase">
                {group.label}
                <Plus className="ml-auto size-3.5 transition-transform duration-200 group-data-[panel-open]/trigger:rotate-45" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          isActive={pathname === item.to}
                          tooltip={item.title}
                          render={<Link to={item.to} />}
                          className="h-auto px-2 py-1 text-xs hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent data-active:bg-transparent data-active:text-sidebar-foreground data-active:shadow-none"
                        >
                          <item.icon className="opacity-35 transition-opacity duration-150 group-data-active/menu-button:opacity-100" />
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
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No tools match “{query}”.
          </p>
        )}
      </SidebarContent>

      <SidebarFooter className="gap-0.5 p-1.5">
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
            className="flex flex-1 items-center justify-center gap-1.5 border border-sidebar-border px-2.5 py-1.5 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:text-sidebar-foreground"
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
