import { AnimatePresence, motion } from "motion/react"

import { resolveEase } from "@/features/motion/eases"
import { RUNG_SWITCH_MS } from "../engine/rungs"
import { COLUMN_LABEL } from "../styles"

/**
 * The reset that plays when you change rung.
 *
 * Changing rung throws away the entire data layer and builds a new one, and
 * that ought to *feel* like more than a toggle flipping — so the app goes out
 * of focus behind a progress bar and comes back cold. The pause is also load
 * bearing: the incoming rung mounts only once this finishes, so its first fetch
 * lands on screen rather than behind the blur.
 */
export function RungSwitch({ toName }: { toName: string | null }) {
  return (
    <AnimatePresence>
      {toName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-20 grid place-items-center bg-background/40"
        >
          <div className="w-52 space-y-2 text-center">
            <p className={COLUMN_LABEL}>Rebuilding with</p>
            <p className="text-sm font-medium">{toName}</p>
            <div className="h-0.5 w-full overflow-hidden bg-border">
              <motion.div
                className="h-full w-full origin-left bg-foreground"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                // Linear and exactly as long as the pause: the bar is a real
                // countdown to the remount, not decoration that finishes early.
                transition={{
                  duration: RUNG_SWITCH_MS / 1000,
                  ease: "linear",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Wraps the shell so it can be pushed out of focus while a switch runs. */
export function SwitchBlur({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  return (
    <motion.div
      animate={{
        filter: active ? "blur(5px)" : "blur(0px)",
        opacity: active ? 0.5 : 1,
      }}
      transition={{ duration: 0.25, ease: resolveEase("smooth") }}
      className="flex min-h-0 flex-1"
    >
      {children}
    </motion.div>
  )
}
