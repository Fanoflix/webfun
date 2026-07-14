import type { Easing } from "motion/react"

/** Classic "bounce out" easing — settles with a couple of decaying hops. */
function easeOutBounce(t: number): number {
  const n1 = 7.5625
  const d1 = 2.75
  if (t < 1 / d1) return n1 * t * t
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
  return n1 * (t -= 2.625 / d1) * t + 0.984375
}

/** Spring-like "elastic out" easing — overshoots, then wobbles into place. */
function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t
  const c4 = (2 * Math.PI) / 3
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

/** The stable id of an easing preset — the union of every preset's `key`. */
export type EaseKey =
  | "smooth"
  | "expoOut"
  | "expoInOut"
  | "springy"
  | "anticipate"
  | "elastic"
  | "bounce"

/** An easing preset for the demos: a stable key, a friendly label, an `Easing`. */
export type EasePreset = { key: EaseKey; label: string; value: Easing }

/**
 * Shared easing presets for the motion demos. Each `value` is a Motion `Easing`
 * — a cubic-bézier tuple, a built-in name, or a custom function. Overshoot
 * presets (Springy / Elastic / Bounce) pop past the target and settle back.
 */
export const EASES: readonly EasePreset[] = [
  { key: "smooth", label: "Smooth", value: [0.22, 1, 0.36, 1] },
  { key: "expoOut", label: "Expo Out", value: [0.16, 1, 0.3, 1] },
  { key: "expoInOut", label: "Expo In-Out", value: [0.87, 0, 0.13, 1] },
  { key: "springy", label: "Springy", value: [0.34, 1.56, 0.64, 1] },
  { key: "anticipate", label: "Anticipate", value: "anticipate" },
  { key: "elastic", label: "Elastic", value: easeOutElastic },
  { key: "bounce", label: "Bounce", value: easeOutBounce },
]

/** The default preset key (a smooth ease-out). */
export const DEFAULT_EASE_KEY: EaseKey = "smooth"

/** Resolve a preset key to its `Easing`, falling back to the first preset. */
export function resolveEase(key: EaseKey): Easing {
  return (EASES.find((e) => e.key === key) ?? EASES[0]).value
}
