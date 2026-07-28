import { useEffect, useMemo, useRef, useState } from "react"

import { useSidebar } from "@/components/ui/sidebar"
import { useFlags } from "@/features/flags/useFlags"
import { isSearchShortcut } from "./shortcut"
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
  /** The search field. `⌘K` focuses it from anywhere in the app. */
  inputRef: React.RefObject<HTMLInputElement | null>
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
  const { unlocked, isVisible } = useFlags()

  const inputRef = useRef<HTMLInputElement>(null)
  const { isMobile, setOpen, setOpenMobile } = useSidebar()

  /**
   * `⌘K` from anywhere jumps to search, opening the rail first if it's away.
   * Pressing it again — while the caret is still in the field — puts the rail
   * back, so the same key gets you in and out without reaching for the mouse.
   *
   * The "still focused" test rather than a plain toggle: if you've opened the
   * rail and gone off to click something else, `⌘K` should bring you back to
   * search, not dismiss the thing you were about to use.
   *
   * Bound on the window rather than the field, since the whole point is to reach
   * it when it isn't on screen — and focus is deferred a frame because a panel
   * that's still sliding in can't take it yet.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) return
      event.preventDefault()

      if (document.activeElement === inputRef.current) {
        inputRef.current?.blur()
        if (isMobile) setOpenMobile(false)
        else setOpen(false)
        return
      }

      if (isMobile) setOpenMobile(true)
      else setOpen(true)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isMobile, setOpen, setOpenMobile])

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [query])

  const searching = debounced.trim().length > 0

  const groups = useMemo<NavGroup[]>(() => {
    // Unreleased tools are dropped before search, so they can't be surfaced by
    // typing their name either.
    return navGroups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) =>
            isVisible(it.tool) &&
            (!searching || itemMatches(it, g.label, debounced))
        ),
      }))
      .filter((g) => g.items.length > 0)
    // `isVisible` closes over `unlocked`, so that's the real dependency.
  }, [debounced, searching, unlocked])

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

  return { query, setQuery, inputRef, groups, isOpen, toggle }
}
