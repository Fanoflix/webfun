import { Outlet } from "@tanstack/react-router"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/features/sidebar/AppSidebar"
import { ThemeToggle } from "@/features/theme/ThemeToggle"

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 px-3">
          <SidebarTrigger />
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
