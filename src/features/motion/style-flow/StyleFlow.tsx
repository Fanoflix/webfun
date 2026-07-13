import { useEffect } from "react"
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react"

import { cn } from "@/lib/utils"
import type {
  CharSchedule,
  Easing,
  RestStyle,
  StyleFlowConfig,
  TrackName,
  TrackPick,
} from "./useStyleFlow"
import { ALL_TRACKS, useStyleFlow } from "./useStyleFlow"

const SANS = "var(--font-sf-sans)"
const SERIF = "var(--font-sf-serif)"

const DEFAULT_EASE: Easing = [0.22, 1, 0.36, 1]

const SLANT_TO_NUM = { normal: 0, italic: 1 } as const
const FAMILY_TO_NUM = { sans: 0, serif: 1 } as const

export type SlantLabel = keyof typeof SLANT_TO_NUM
export type FamilyLabel = keyof typeof FAMILY_TO_NUM

/** Rest style expressed in friendly labels. */
export type RestStyleInput = {
  weight?: number
  slant?: SlantLabel
  family?: FamilyLabel
  size?: number
}

/**
 * Props for {@link StyleFlow}. Every animatable dimension is configurable; all
 * props except `value` are optional and fall back to sensible defaults.
 */
export type StyleFlowProps = {
  /** The text to animate. Each character gets its own independent timeline. */
  value: string
  /** Class applied to the wrapping inline element (fonts, tracking, color…). */
  className?: string

  /**
   * Which style tracks are allowed to change. Any track left out stays pinned at
   * its resting value for the whole run.
   * @defaultValue `["weight", "slant", "family", "size"]`
   */
  tracks?: TrackName[]
  /**
   * Discrete font weights the `weight` track roams between. Clamp to axis range
   * of the loaded variable fonts (Recursive/Fraunces support 300–900).
   * @defaultValue `[500, 600, 700]`
   */
  weights?: number[]
  /**
   * Allowed slants for the `slant` track. Providing a single value effectively
   * disables the track.
   * @defaultValue `["normal", "italic"]`
   */
  slants?: SlantLabel[]
  /**
   * Allowed families for the `family` track. Providing a single value
   * effectively disables the track.
   * @defaultValue `["sans", "serif"]`
   */
  families?: FamilyLabel[]
  /**
   * `[min, max]` font size in px for the `size` track. Deliberately kept tight —
   * this is a shimmer, not a jump from body to display.
   * @defaultValue `[14, 15]`
   */
  sizeRange?: [number, number]
  /**
   * Oblique angle (in the sans `slnt` axis) mapped to a fully italic
   * `slant = 1`. Negative leans right, matching Recursive's axis direction.
   * @defaultValue `-14`
   */
  slantAngle?: number

  /**
   * Turns a track must wait after changing before it may change again — the core
   * rule that stops the shimmer fidgeting on one axis. `1` ⇒ never twice in a
   * row.
   * @defaultValue `1`
   */
  cooldown?: number
  /**
   * How the next track is chosen among the eligible ones each turn.
   * @defaultValue `"random"`
   */
  trackPick?: TrackPick
  /**
   * RNG seed. The same seed reproduces the exact same shimmer, which also keeps
   * server and client render deterministic (no hydration mismatch).
   * @defaultValue `1`
   */
  seed?: number

  /**
   * Total run length in seconds. The animation is finite: it plays once and
   * settles back to `restStyle`.
   * @defaultValue `6`
   */
  duration?: number
  /**
   * Seconds between the *start* of a character's consecutive turns.
   * @defaultValue `0.6`
   */
  stepInterval?: number
  /**
   * Seconds a single track transition takes. Keep `≤ stepInterval` so
   * transitions don't overlap.
   * @defaultValue `0.42`
   */
  stepDuration?: number
  /**
   * Easing applied to each transition (a Motion easing name or cubic-bézier
   * array).
   * @defaultValue `[0.22, 1, 0.36, 1]`
   */
  ease?: Easing

  /**
   * Seconds between adjacent characters' first turn — the left-to-right cascade.
   * `0` starts every character together.
   * @defaultValue `0.12`
   */
  stagger?: number
  /**
   * Which end the stagger cascade originates from.
   * @defaultValue `"first"`
   */
  staggerFrom?: "first" | "last" | "center"

  /**
   * The look every character starts from and eases back to when the run ends.
   * Unspecified fields fall back to the first weight, upright, sans, and the min
   * size.
   */
  restStyle?: RestStyleInput

  /**
   * Play automatically on mount. When `false`, characters hold at `restStyle`.
   * @defaultValue `true`
   */
  autoPlay?: boolean
  /**
   * Change this value to replay the run from the start (e.g. increment it on a
   * "replay" button).
   * @defaultValue `0`
   */
  playToken?: number

  /**
   * When `false`, renders plain static text at the rest style with no motion.
   * @defaultValue `true`
   */
  animated?: boolean
  /**
   * Honor the OS "reduce motion" setting by rendering static text.
   * @defaultValue `true`
   */
  respectMotionPreference?: boolean
}

type GlyphRender = {
  duration: number
  ease: Easing
  slantAngle: number
  rest: RestStyle
  playToken: number
  autoPlay: boolean
}

/**
 * One character: a hidden in-flow *sizer* locks the cell to its rest width (so
 * nothing ever reflows), and two absolutely-stacked layers — the Recursive sans
 * face and the Fraunces serif face — crossfade for the family track while both
 * ride the shared weight / slant / size motion values.
 */
function StyleGlyph({
  schedule,
  render,
}: {
  schedule: CharSchedule
  render: GlyphRender
}) {
  const { rest, slantAngle } = render
  const mvWeight = useMotionValue(rest.weight)
  const mvSlant = useMotionValue(rest.slant)
  const mvFamily = useMotionValue(rest.family)
  const mvSize = useMotionValue(rest.size)

  useEffect(() => {
    if (!render.autoPlay) {
      mvWeight.set(rest.weight)
      mvSlant.set(rest.slant)
      mvFamily.set(rest.family)
      mvSize.set(rest.size)
      return
    }
    const common = { duration: render.duration, ease: render.ease }
    const controls = [
      animate(mvWeight, schedule.weight.values, {
        ...common,
        times: schedule.weight.times,
      }),
      animate(mvSlant, schedule.slant.values, {
        ...common,
        times: schedule.slant.times,
      }),
      animate(mvFamily, schedule.family.values, {
        ...common,
        times: schedule.family.times,
      }),
      animate(mvSize, schedule.size.values, {
        ...common,
        times: schedule.size.times,
      }),
    ]
    return () => controls.forEach((c) => c.stop())
  }, [schedule, render.playToken, render.autoPlay, render.duration])

  const sansVar = useTransform([mvWeight, mvSlant], ([w, s]: number[]) => {
    return `'wght' ${Math.round(w)}, 'slnt' ${(s * slantAngle).toFixed(2)}`
  })
  const serifVar = useTransform(mvWeight, (w) => `'wght' ${Math.round(w)}`)
  const serifStyle = useTransform(mvSlant, (s) => (s >= 0.5 ? "italic" : "normal"))
  const sansOpacity = useTransform(mvFamily, (f) => 1 - f)

  return (
    <span
      aria-hidden
      className="relative inline-block text-center leading-none whitespace-pre"
    >
      {/* Sizer: rest-style copy, hidden, fixes the cell width so no reflow. */}
      <span
        className="invisible"
        style={{
          fontFamily: SANS,
          fontWeight: rest.weight,
          fontSize: rest.size,
        }}
      >
        {schedule.char}
      </span>
      <motion.span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          fontFamily: SANS,
          fontVariationSettings: sansVar,
          fontSize: mvSize,
          opacity: sansOpacity,
        }}
      >
        {schedule.char}
      </motion.span>
      <motion.span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          fontFamily: SERIF,
          fontVariationSettings: serifVar,
          fontStyle: serifStyle,
          fontSize: mvSize,
          opacity: mvFamily,
        }}
      >
        {schedule.char}
      </motion.span>
    </span>
  )
}

/** Resolve the friendly rest input against the track sets into numbers. */
function resolveRest(
  input: RestStyleInput | undefined,
  weights: number[],
  sizeRange: [number, number]
): RestStyle {
  return {
    weight: input?.weight ?? weights[0],
    slant: SLANT_TO_NUM[input?.slant ?? "normal"],
    family: FAMILY_TO_NUM[input?.family ?? "sans"],
    size: input?.size ?? sizeRange[0],
  }
}

/**
 * StyleFlow — a per-character typographic shimmer. Each character independently
 * drifts across four style tracks (weight, slant, family, size); a track can
 * never change twice within `cooldown` turns, so the motion never looks like it
 * is fidgeting on a single axis. The run is finite: everything eases back to
 * `restStyle` and stops. Honors `prefers-reduced-motion`.
 */
export function StyleFlow({
  value,
  className,
  tracks = ALL_TRACKS,
  weights = [500, 600, 700],
  slants = ["normal", "italic"],
  families = ["sans", "serif"],
  sizeRange = [14, 15],
  slantAngle = -14,
  cooldown = 1,
  trackPick = "random",
  seed = 1,
  duration = 6,
  stepInterval = 0.6,
  stepDuration = 0.42,
  ease = DEFAULT_EASE,
  stagger = 0.12,
  staggerFrom = "first",
  restStyle,
  autoPlay = true,
  playToken = 0,
  animated = true,
  respectMotionPreference = true,
}: StyleFlowProps) {
  const reduce = useReducedMotion()
  const rest = resolveRest(restStyle, weights, sizeRange)

  const config: StyleFlowConfig = {
    tracks,
    weights,
    slants: slants.map((s) => SLANT_TO_NUM[s]),
    families: families.map((f) => FAMILY_TO_NUM[f]),
    sizeRange,
    cooldown,
    trackPick,
    seed,
    duration,
    stepInterval,
    stepDuration,
    stagger,
    staggerFrom,
    rest,
  }

  const schedules = useStyleFlow(value, config)

  const isStatic = !animated || (respectMotionPreference && reduce)

  if (isStatic) {
    return (
      <span
        className={className}
        style={{
          fontFamily: rest.family >= 0.5 ? SERIF : SANS,
          fontWeight: rest.weight,
          fontStyle: rest.slant >= 0.5 ? "italic" : "normal",
          fontSize: rest.size,
        }}
      >
        {value}
      </span>
    )
  }

  const render: GlyphRender = {
    duration,
    ease,
    slantAngle,
    rest,
    playToken,
    autoPlay,
  }

  return (
    <span
      className={cn("inline-flex items-baseline", className)}
      aria-label={value}
    >
      {schedules.map((schedule, i) => (
        <StyleGlyph key={i} schedule={schedule} render={render} />
      ))}
    </span>
  )
}
