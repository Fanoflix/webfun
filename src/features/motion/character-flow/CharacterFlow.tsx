import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

type CharacterFlowProps = {
  /** The string to display. Changing it animates from the previous value. */
  value: string
  className?: string
  /** Seconds for a character to travel / roll. */
  duration?: number
}

type KeyedChar = { key: string; char: string }

/**
 * Splits a string into characters, giving each a key by *identity, not index*:
 * the Nth occurrence of a character always gets the same key across renders.
 * So a character that survives an edit keeps its key and animates from its old
 * position to its new one, while genuinely-new/removed characters enter/exit.
 * `Array.from` (not `split("")`) so surrogate pairs / emoji stay one unit.
 */
function toKeyedChars(value: string): KeyedChar[] {
  const seen = new Map<string, number>()
  return Array.from(value).map((char) => {
    const n = seen.get(char) ?? 0
    seen.set(char, n + 1)
    return { key: `${char}#${n}`, char }
  })
}

/**
 * NumberFlow-style transition for *any* string. When `value` changes, characters
 * present in both the old and new value slide to their new place; the rest roll
 * in from above / out below with a fade — the departure-board / odometer feel.
 *
 * How it works: each character is its own `motion.span`, keyed by identity (see
 * `toKeyedChars`). `layout="position"` FLIPs survivors to their new x with a
 * GPU transform; `AnimatePresence mode="popLayout"` pops exiting characters out
 * of flow so the survivors reflow-and-slide immediately. Transforms + opacity
 * only — no width/reflow work per frame. Honors `prefers-reduced-motion`.
 */
export function CharacterFlow({
  value,
  className,
  duration = 0.3,
}: CharacterFlowProps) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <span className={className}>{value}</span>
  }

  return (
    <span className={cn("relative inline-flex", className)} aria-label={value}>
      <AnimatePresence mode="popLayout" initial={false}>
        {toKeyedChars(value).map(({ key, char }) => (
          <motion.span
            key={key}
            layout="position"
            aria-hidden
            className="inline-block whitespace-pre"
            initial={{ opacity: 0, y: "-0.55em" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "0.55em", transition: { duration: 0 } }}
            transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
          >
            {char}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  )
}
