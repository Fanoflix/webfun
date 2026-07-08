import type { CSSProperties } from "react"
import { Outlet } from "@tanstack/react-router"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/features/sidebar/AppSidebar"

/**
 * The toggle lives *inside* the sidebar while it's open; this one shows in the
 * main header only when the sidebar is collapsed (or on mobile, where the panel
 * is an off-screen sheet) so there's always a way back to it.
 */
function InsetSidebarTrigger() {
  const { state, isMobile } = useSidebar()
  if (!isMobile && state !== "collapsed") return null
  return <SidebarTrigger />
}

export function AppLayout() {
  return (
    // Zero the reserved gap so the floating sidebar overlays content instead of
    // pushing it — no layout shift; the fixed container just floats on top.
    // Widen the track so the p-12 float-margin still leaves a comfortable card.
    <SidebarProvider
      className="[&_[data-slot=sidebar-gap]]:w-0"
      style={{ "--sidebar-width": "22rem" } as CSSProperties}
    >
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 px-3">
          <InsetSidebarTrigger />
        </header>
        <main className="flex flex-1 items-center justify-center p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
