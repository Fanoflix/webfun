import { useAnimate, useReducedMotion } from "motion/react"
import { useEffect } from "react"

import { resolveEase } from "@/features/motion/eases"
import { isSearchShortcut } from "./shortcut"

/**
 * Makes the `⌘K` badge dip when the shortcut is actually pressed.
 *
 * The badge is the only thing on screen that names the shortcut, so it's also
 * the only thing that can confirm one was heard — pressing a key and having
 * nothing acknowledge it reads as a dead binding, especially when the sidebar
 * it opens is off screen.
 *
 * Driven imperatively rather than off state so it can't be missed: the badge
 * doesn't re-render on a keypress, and both copies of it live in different
 * trees, so each one listens for itself rather than being handed a flag.
 */
export function useShortcutPress<T extends Element>() {
  const [scope, animate] = useAnimate<T>()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return

    const onKeyDown = (event: KeyboardEvent) => {
      // The listener is only bound after mount, so the scope is always attached.
      if (!isSearchShortcut(event)) return
      void animate(
        scope.current,
        { scale: [1, 0.85, 1] },
        { duration: 0.18, ease: resolveEase("expoOut") }
      )
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [animate, reduced, scope])

  return scope
}
