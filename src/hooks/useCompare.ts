import { useState } from "react"

/**
 * The two ways to look at the "before" of a before/after.
 *
 * Both live here because the dithering and anti-aliasing tools want exactly the
 * same pair, and because the interesting part is how they combine:
 *
 * - **Latched** — a toggle in the controls panel. Stays on until you switch it
 *   off. This is what you need when the comparison isn't a glance: dragging a
 *   slider while watching the original, or leaving it on to point something out
 *   to someone else. Holding a button can't do that.
 * - **Peeking** — press and hold on the canvas itself. Momentary, zero travel,
 *   right where your eyes already are.
 *
 * They combine with XOR, not OR, so a hold always shows *the other one*. Held
 * while latched, you get the processed image back. That keeps the gesture
 * meaningful in both states instead of being dead half the time — with OR, a
 * hold would do nothing whenever the toggle was already on, which reads as a
 * broken control rather than a deliberate one.
 */
export function useCompare() {
  const [latched, setLatched] = useState(false)
  const [peeking, setPeeking] = useState(false)

  return {
    /** What the view should actually render as "before". */
    comparing: latched !== peeking,
    latched,
    setLatched,
    startPeek: () => setPeeking(true),
    endPeek: () => setPeeking(false),
  }
}
