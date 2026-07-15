import { useMemo } from "react"

import { useFlags } from "@/features/flags/useFlags"
import { navGroups } from "@/features/sidebar/nav-items"
import type { NavGroup } from "@/features/sidebar/nav-items"

export type HomeNav = {
  /** Categories with their tools, minus anything not released to this visitor. */
  groups: NavGroup[]
}

/**
 * The tool index behind the home page. Reads the same `navGroups` and release
 * flags the sidebar does, so the cards can never surface a tool the sidebar is
 * hiding.
 */
export function useHomeNav(): HomeNav {
  const { unlocked, isVisible } = useFlags()

  const groups = useMemo<NavGroup[]>(
    () =>
      navGroups
        .map((g) => ({ ...g, items: g.items.filter((it) => isVisible(it.tool)) }))
        .filter((g) => g.items.length > 0),
    // `isVisible` closes over `unlocked`, so that's the real dependency.
    [unlocked]
  )

  return { groups }
}
