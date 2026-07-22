import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { CHAT_EASE } from "../engine/defaults"
import type { Author } from "../engine/types"

/**
 * **Animation 2.** Three dots, one lit at a time, running left to right.
 *
 * It floats just above the composer, overlaying the bottom of the thread. The
 * position is absolute precisely so it can't push anything: it takes no space in
 * the column, so appearing and disappearing costs zero layout shift — the
 * problem with having it inline in the message list, where it inserted and
 * removed a row on every exchange.
 *
 * It grows upward out of the composer's top edge, which is what anchoring to
 * `bottom-full` and animating height gets you for free.
 *
 * The dots are `bg-foreground` at low opacity rather than a fixed grey, so "dim"
 * and "lit" both track the theme — grey on either background, and the lit one
 * lands on true black or true white without a second colour to maintain.
 *
 * The rhythm comes from the `times` array, not the easing: each dot lights and
 * drops inside the first third of its cycle and then sits dark. Spreading the
 * motion evenly would read as breathing; this reads as a chase.
 */

const CYCLE_S = 1.05
const DIM = 0.25

const KEYFRAMES = { opacity: [DIM, 1, DIM, DIM] }
const TIMES = [0, 0.14, 0.32, 1]

export function TypingIndicator({
  author,
  active,
}: {
  author: Author
  active: boolean
}) {
  const reduced = useReducedMotion()

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-live="polite"
          initial={reduced ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reduced ? undefined : { height: 0, opacity: 0 }}
          transition={
            reduced ? { duration: 0 } : { duration: 0.15, ease: CHAT_EASE }
          }
          // `inset-x-0` tracks the composer's width — it runs edge to edge, so
          // this does too. No bottom margin: it rests directly on the composer's
          // top edge and reads as part of the same object, which is what the
          // top-only rounding is for.
          className="absolute inset-x-0 bottom-full z-10 overflow-hidden rounded-t bg-muted"
        >
          <div className="flex items-center gap-1 px-2 py-0">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                aria-hidden
                className="size-1 rounded-full bg-foreground"
                initial={{ opacity: DIM }}
                animate={reduced ? { opacity: DIM } : KEYFRAMES}
                transition={
                  reduced
                    ? { duration: 0 }
                    : {
                        duration: CYCLE_S,
                        times: TIMES,
                        repeat: Infinity,
                        ease: "easeOut",
                        // A third of the cycle apart, so exactly one dot is lit
                        // at any moment and the highlight travels along the row.
                        delay: (i * CYCLE_S) / 3,
                      }
                }
              />
            ))}
            <span className="text-[9px] font-medium whitespace-nowrap text-muted-foreground">
              {author.name} is typing
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
