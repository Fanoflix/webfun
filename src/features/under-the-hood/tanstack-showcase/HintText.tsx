import { Fragment } from "react"

import { RUNGS } from "./engine/rungs"

/**
 * Renders a hint with the rung names picked out in bold.
 *
 * Every hint works by comparison — "React Query still paid for the first open"
 * only lands if you can see at a glance *which* rung is being compared. Bolding
 * the names turns a wall of prose into a sentence with a subject.
 *
 * Built from `RUNGS` rather than a hard-coded list, so renaming a rung can't
 * quietly stop its name being emphasised. Longest first, or "TanStack DB"
 * would be matched as plain text after a shorter name won the race.
 */
const RUNG_NAMES = RUNGS.map((rung) => rung.name).sort(
  (a, b) => b.length - a.length
)

const PATTERN = new RegExp(`(${RUNG_NAMES.join("|")})`, "g")

export function HintText({ text }: { text: string }) {
  // One wrapping element, not a fragment: the tooltip popup lays its children
  // out as flex items, so returning several siblings turned a sentence into
  // columns of words.
  return (
    <span className="block">
      {text.split(PATTERN).map((part, i) =>
        RUNG_NAMES.includes(part) ? (
          <strong key={i} className="font-semibold">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </span>
  )
}
