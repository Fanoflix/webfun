import { useEffect, useRef } from "react"

/**
 * Marks an element as held for exactly as long as its shortcut is held down.
 *
 * The press and the action are deliberately split: `data-pressed` goes on at
 * keydown and comes off at keyup, while the shortcut's *effect* runs on release
 * (see `bindShortcutRelease`). So holding ⌘B keeps the control visibly depressed
 * and nothing happens until you let go — the same contract as pressing and
 * holding a real button.
 *
 * The styling is left to the caller as `data-pressed:` classes rather than
 * animated here. A held state has no duration to animate over, and the colours
 * have to come from the stylesheet to be right in both themes.
 */
/**
 * What being held looks like. Shared so the controls can't drift apart.
 *
 * `scale`, not `transform`: Tailwind's `scale-*` sets the standalone `scale`
 * property, so a transition naming `transform` animates nothing and the size
 * change lands in a single frame instead.
 */
export const HELD_CLASS =
  "transition-[scale,background-color,transform] duration-75 ease-out data-pressed:translate-y-0.25 data-pressed:scale-95 data-pressed:bg-muted/25 motion-reduce:data-pressed:scale-100"

export function useShortcutHold<T extends HTMLElement>(
  matches: (event: KeyboardEvent) => boolean
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const release = () => ref.current?.removeAttribute("data-pressed")

    const onKeyDown = (event: KeyboardEvent) => {
      if (!matches(event)) return
      // The browser claims these combinations; by keyup it has already acted.
      event.preventDefault()
      ref.current?.setAttribute("data-pressed", "")
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", release)
    /**
     * Held state has to survive losing focus. Switching apps mid-hold means the
     * keyup lands somewhere else entirely and never reaches us, leaving the
     * control stuck looking pressed.
     */
    window.addEventListener("blur", release)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", release)
      window.removeEventListener("blur", release)
    }
  }, [matches])

  return ref
}
