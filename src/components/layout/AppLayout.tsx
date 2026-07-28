import type { CSSProperties } from "react"
import { Outlet } from "@tanstack/react-router"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { ToolGate } from "@/features/flags/ToolGate"
import { AppSidebar } from "@/features/sidebar/AppSidebar"
import { WebfunMark } from "@/features/sidebar/WebfunMark"

/**
 * The toggle lives *inside* the sidebar while it's open; this one shows in the
 * main header only when the sidebar is collapsed (or on mobile, where the panel
 * is an off-screen sheet) so there's always a way back to it.
 */
function InsetSidebarTrigger() {
  const { state, isMobile } = useSidebar()
  if (!isMobile && state !== "collapsed") return null
  return (
    // The shortcut hint rides along here because this is exactly when it's worth
    // knowing: the search field it jumps to isn't on screen to advertise itself.
    <div className="group flex items-center gap-4">
      <SidebarTrigger />

      {/* With the rail away this is the only thing still identifying the site,
          so it sits at the end of the row rather than disappearing with it. */}
      <WebfunMark className="size-4 shrink-0 text-muted-foreground" />
    </div>
  )
}

export function AppLayout() {
  return (
    // Zero the reserved gap so the floating sidebar overlays content instead of
    // pushing it — no layout shift; the fixed container just floats on top.
    // Widen the track so the p-12 float-margin still leaves a comfortable card.
    <SidebarProvider
      className="[&_[data-slot=sidebar-gap]]:w-0"
      style={{ "--sidebar-width": "18rem" } as CSSProperties}
    >
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 px-3">
          <InsetSidebarTrigger />
        </header>
        <main className="flex flex-1 items-center justify-center p-6">
          <ToolGate>
            <Outlet />
          </ToolGate>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
