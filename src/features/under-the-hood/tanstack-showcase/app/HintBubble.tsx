import { AnimatePresence, motion } from "motion/react"

import { resolveEase } from "@/features/motion/eases"
import type { ShowcaseEvent } from "../engine/types"

/**
 * The running commentary in App mode: the latest event, in words, floating over
 * the UI that caused it. Same stream the timeline reads — this one just shows
 * the head of it, so the two can never disagree.
 *
 * Anchored bottom-right: the top of the pane is where the composer and the
 * detail heading live, and a bubble there covered the Add button.
 */
export function HintBubble({ event }: { event: ShowcaseEvent | undefined }) {
  return (
    <div className="pointer-events-none absolute right-3 bottom-3 z-10">
      <AnimatePresence mode="popLayout">
        {event && (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25, ease: resolveEase("smooth") }}
            className="border border-border bg-background px-2 py-1 shadow-lg"
          >
            <span className="text-xs text-foreground">{event.label}</span>
            {event.detail && (
              <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                {event.detail}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
