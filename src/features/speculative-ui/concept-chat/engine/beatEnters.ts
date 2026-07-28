/**
 * How a beat arrives when a timeline message plays.
 *
 * A registry rather than a union of hardcoded branches: adding `slide` or `scale`
 * later is one entry here, and `BeatEnter` widens to match with no renderer, no
 * validator and no type edit anywhere else. v1 deliberately ships one.
 *
 * These compose *on top of* the height growth every landing beat shares (animation
 * #1) — an enter spec says how the beat's contents appear, never how the row makes
 * room for itself.
 */

import type { TargetAndTransition } from "motion/react"

export type BeatEnterSpec = {
  initial: TargetAndTransition
  animate: TargetAndTransition
  /** Seconds. Kept per-spec because a slide and a fade want different lengths. */
  duration: number
}

export const BEAT_ENTERS = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    duration: 0.3,
  },
} satisfies Record<string, BeatEnterSpec>

export type BeatEnter = keyof typeof BEAT_ENTERS
