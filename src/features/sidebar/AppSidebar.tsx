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
import { useSidebarNav } from "./useSidebarNav"

const REPO_URL = "https://github.com/Fanoflix/webfun"
const SITE_URL = "https://ammarnasir.com"

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { query, setQuery, inputRef, groups, isOpen, toggle } = useSidebarNav()

  return (
    <Sidebar variant="floating" className="p-4">
      <SidebarHeader className="gap-0.5 px-4">
        <div className="flex items-center justify-between">
          <div className="px-1 py-1 text-xs font-semibold tracking-widest uppercase">
            webfun
          </div>
          <SidebarTrigger />
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
          <SearchHint className="absolute top-1/2 right-2 -translate-y-1/2" />
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
                          <item.icon className="active:opacity-100" />
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
