import { AnimatePresence, motion } from "motion/react"

import { resolveEase } from "@/features/motion/eases"
import type { ShowcaseEvent } from "../engine/types"

/**
 * The running commentary in App mode: the latest event, in words, floating over
 * the UI that caused it. Same stream the timeline reads — this one just shows
 * the head of it, so the two can never disagree.
 *
 * Anchored above the detail pane's action bar. Top-right collided with the
 * composer and the status badge; flat bottom-right covered the Delete button.
 * This is the one corner of the window with nothing in it.
 */
export function HintBubble({ event }: { event: ShowcaseEvent | undefined }) {
  return (
    <div className="pointer-events-none absolute right-3 bottom-[4.5rem] z-10">
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
