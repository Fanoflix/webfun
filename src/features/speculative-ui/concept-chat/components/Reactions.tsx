import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"
import { CHAT_EASE, VIEWER_ID } from "../engine/defaults"
import type { Reaction } from "../engine/types"

/**
 * The reaction row under a message.
 *
 * **Animation 4.** A reaction slides out from the left — width 0 to intrinsic,
 * origin centre-left — 0.2s expo out. Widths animate from `width: 0` with the
 * content clipped, which is why the pill's padding lives on an inner element:
 * animating a padded box to zero width squashes the emoji on the way in.
 */

export function Reactions({
  reactions,
  onToggle,
}: {
  reactions: Reaction[]
  onToggle: (emoji: string) => void
}) {
  const reduced = useReducedMotion()

  if (reactions.length === 0) return null

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <AnimatePresence initial={false}>
        {reactions.map((reaction) => {
          const mine = reaction.by.includes(VIEWER_ID)
          return (
            <motion.button
              key={reaction.emoji}
              type="button"
              onClick={() => onToggle(reaction.emoji)}
              initial={reduced ? false : { width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={reduced ? undefined : { width: 0, opacity: 0 }}
              transition={
                reduced ? { duration: 0 } : { duration: 0.2, ease: CHAT_EASE }
              }
              style={{ originX: 0 }}
              className={cn(
                "overflow-hidden border text-xs",
                mine
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-secondary/60 hover:border-muted-foreground/40"
              )}
              aria-label={`${reaction.emoji} ${reaction.by.length}`}
              aria-pressed={mine}
            >
              <span className="flex items-center gap-1 px-1.5 py-0.5 whitespace-nowrap">
                <span>{reaction.emoji}</span>
                <span className="tabular-nums text-muted-foreground">
                  {reaction.by.length}
                </span>
              </span>
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
