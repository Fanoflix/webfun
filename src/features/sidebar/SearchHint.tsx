import { isSearchShortcut } from "./shortcut"
import { HELD_CLASS, useShortcutHold } from "./useShortcutHold"

/**
 * The `⌘K` badge.
 *
 * Shown twice: on the face of the rail's toggle, and inside the search field it
 * jumps to. A shortcut nobody can see is a shortcut nobody uses.
 *
 * Dim by default and only lit on hover — it's a hint, not a control, and it
 * shouldn't pull attention away from the thing it's sitting on.
 */
export function SearchHint({
  className = "",
  /**
   * Whether this copy depresses while ⌘K is held.
   *
   * Off by default because the copy on the toggle sits inside a button that
   * already reacts, and two nested scales would compound into a much deeper dip
   * than either intends. Only the standalone copy in the search field opts in.
   */
  held = false,
}: {
  className?: string
  held?: boolean
}) {
  const ref = useShortcutHold<HTMLSpanElement>(isSearchShortcut)

  return (
    <span
      ref={held ? ref : undefined}
      aria-hidden
      // `inline-block` so the scale lands — transforms are ignored on inline
      // boxes.
      className={`pointer-events-none inline-block rounded border border-border px-1.5 py-0.5 text-xs font-normal tracking-wider whitespace-nowrap opacity-55 transition-opacity duration-75 group-hover:opacity-100 ${held ? HELD_CLASS : ""} ${className}`}
    >
      ⌘K
    </span>
  )
}
