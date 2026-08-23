import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/lib/utils"
import { MONO } from "../styles"
import type { ShowcaseEvent } from "../engine/types"

/**
 * The app's own status line: what it last did, in its own words.
 *
 * This used to be a bubble floating over the ticket body, which put it on top of
 * the content, clipped it at the pane edge, and repeated — a few centimetres
 * away — what the network panel was already saying in more detail.
 *
 * In the header it behaves like the status text a real product keeps in its
 * chrome ("Saving…", "Saved"): always in the same place, never covering
 * anything, and glanceable without looking away from the app. The panel remains
 * the place for detail; this is just the app admitting what it's up to.
 */
export function AppStatus({
  event,
  error,
}: {
  event: ShowcaseEvent | undefined
  error: string | null
}) {
  // A failed write outranks whatever happened most recently — it's the one
  // thing here the reader may need to act on.
  if (error) {
    return <span className="truncate text-xs text-destructive">{error}</span>
  }

  return (
    <div className="flex min-w-0 items-baseline justify-end gap-1.5">
      <AnimatePresence mode="wait" initial={false}>
        {event && (
          <motion.span
            key={event.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Opacity only. Anything that moves in a header reads as a layout
            // bug rather than a status change.
            transition={{ duration: 0.12 }}
            className="flex min-w-0 items-baseline gap-1.5"
          >
            <span className="truncate text-xs text-muted-foreground">
              {event.label}
            </span>
            {event.detail && (
              <span
                className={cn(
                  MONO,
                  "hidden truncate text-muted-foreground/70 sm:inline"
                )}
              >
                {event.detail}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
