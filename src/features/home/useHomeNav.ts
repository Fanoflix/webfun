import { navGroups } from "@/features/sidebar/nav-items"
import type { NavGroup } from "@/features/sidebar/nav-items"

export type HomeNav = {
  /** Categories with their tools. */
  groups: NavGroup[]
}

/**
 * The tool index behind the home page. Reads the same `navGroups` the sidebar
 * does, so the cards and the rail can never disagree about what exists.
 */
export function useHomeNav(): HomeNav {
  return { groups: navGroups }
}
