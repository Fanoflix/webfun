import { useEffect, useMemo, useState } from "react"

import { navGroups } from "./nav-items"
import type { NavGroup, NavItem } from "./nav-items"

/** How long the search waits after the last keystroke before filtering. */
const SEARCH_DEBOUNCE_MS = 150

/**
 * Fuzzy subsequence test: does every character of `query` appear in `text`, in
 * order (not necessarily adjacent)? So "dth" matches "dithering". Case-folded.
 */
function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let i = 0
  for (let j = 0; j < t.length && i < q.length; j++) {
    if (t[j] === q[i]) i++
  }
  return i === q.length
}

/** An item matches if the query fuzzily hits its title, category, or a keyword. */
function itemMatches(item: NavItem, groupLabel: string, query: string): boolean {
  if (!query.trim()) return true
  const haystacks = [item.title, groupLabel, ...(item.keywords ?? [])]
  return haystacks.some((h) => fuzzyMatch(query, h))
}

export type SidebarNav = {
  query: string
  setQuery: (value: string) => void
  /** Groups after search filtering; empty groups are dropped. */
  groups: NavGroup[]
  isOpen: (label: string) => boolean
  toggle: (label: string, open: boolean) => void
}

/**
 * Owns the sidebar's search string and per-section open state. Sections start
 * expanded; a section the user collapses is remembered. While searching, every
 * section with a hit is force-opened so results are always visible, and the
 * user's manual collapses resume once the query is cleared.
 */
export function useSidebarNav(): SidebarNav {
  const [query, setQuery] = useState("")
  // The debounced value that actually drives filtering; the input stays bound to
  // `query` so typing feels instant while results settle after a short pause.
  const [debounced, setDebounced] = useState("")
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [query])

  const searching = debounced.trim().length > 0

  const groups = useMemo<NavGroup[]>(() => {
    if (!searching) return navGroups
    return navGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => itemMatches(it, g.label, debounced)),
      }))
      .filter((g) => g.items.length > 0)
  }, [debounced, searching])

  const isOpen = (label: string) => searching || !collapsed.has(label)

  const toggle = (label: string, open: boolean) => {
    // While searching, sections are forced open; ignore toggles so state stays
    // clean for when the query clears.
    if (searching) return
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (open) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return { query, setQuery, groups, isOpen, toggle }
}
