import type { CSSProperties } from "react"
import { Outlet } from "@tanstack/react-router"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/features/sidebar/AppSidebar"

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
          <SidebarTrigger />
        </header>
        <main className="flex flex-1 items-center justify-center p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
