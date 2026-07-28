import { useShortcutPress } from "./useShortcutPress"

/**
 * The `⌘K` badge.
 *
 * Shown in two places, which is the whole point: inside the search field when
 * the rail is open, and beside the expand toggle when it's collapsed. A shortcut
 * nobody can see is a shortcut nobody uses, and the collapsed state is exactly
 * when it's most worth knowing — the field it jumps to isn't on screen.
 *
 * Dim by default and only half-lit on hover: it's a hint, not a control, and it
 * shouldn't pull attention away from the thing it's sitting on. It does dip when
 * the shortcut is pressed, though — see `useShortcutPress`.
 */
export function SearchHint({ className = "" }: { className?: string }) {
  const scope = useShortcutPress<HTMLSpanElement>()

  return (
    <span
      ref={scope}
      aria-hidden
      // `inline-block` so the press animation lands — transforms are ignored on
      // inline boxes.
      className={`pointer-events-none inline-block rounded border border-border px-1.5 py-0.5 text-xs whitespace-nowrap text-muted-foreground opacity-75 transition-opacity duration-75 group-hover:opacity-100 ${className}`}
    >
      ⌘K
    </span>
  )
}
