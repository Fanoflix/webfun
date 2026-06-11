import type { LucideIcon } from "lucide-react"
import { MonitorPlay } from "lucide-react"

/**
 * A single L1 sidebar entry. We're flat for now, but the shape is kept small so
 * that adding categories later is a matter of wrapping these in groups (see
 * `NavGroup` below) rather than reworking the item type.
 */
export type NavItem = {
  title: string
  to: string
  icon: LucideIcon
}

/**
 * Reserved for when categories land. A group is just a label + its items, so
 * `navItems` below can become `navGroups: NavGroup[]` without touching consumers
 * that already iterate items.
 */
export type NavGroup = {
  label: string
  items: NavItem[]
}

export const navItems: NavItem[] = [
  { title: "Low Res Video", to: "/low-res-video", icon: MonitorPlay },
]
