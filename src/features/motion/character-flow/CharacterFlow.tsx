import { useEffect, useRef } from "react"
import type { Easing } from "motion/react"
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "motion/react"

import { cn } from "@/lib/utils"

/** Direction the content rolls when a character changes. */
export type Trend = "up" | "down"

/** Where a character cascade originates. */
export type StaggerFrom = "first" | "last" | "center"

/** Timing for one animation phase. Mirrors Framer's tween options. */
export type FlowTiming = {
  /** Seconds. */
  duration?: number
  ease?: Easing
  /** Seconds of head start. */
  delay?: number
}

export type CharacterFlowProps = {
  /** The string to display. Changing it animates from the previous value. */
  value: string
  className?: string

  /**
   * Duration (seconds) of the *vertical character roll* — how fast a character
   * scrolls in / out. Independent of the horizontal layout slide (`transition`).
   */
  duration?: number
  /** Easing of the vertical character roll. */
  ease?: Easing

  /** Timing for characters rolling *in* (defaults to `duration`/`ease`). */
  enter?: FlowTiming
  /** Timing for characters rolling *out* (defaults to `duration`/`ease`). */
  exit?: FlowTiming

  /**
   * Duration (seconds) of the *horizontal layout slide* — surviving characters
   * sliding to their new x when the string grows / shrinks. Fully independent of
   * the vertical roll speed (`duration`).
   */
  layoutDuration?: number
  /** Easing of the horizontal layout slide. */
  layoutEase?: Easing
  /**
   * Advanced full override for the horizontal layout slide (adds `delay`; wins
   * over `layoutDuration` / `layoutEase`).
   */
  transition?: FlowTiming

  /** Seconds between adjacent entering characters. `0` disables the cascade. */
  stagger?: number
  /** Which end the cascade starts from. */
  staggerFrom?: StaggerFrom

  /** Which way characters roll. `"up"` reads as advancing / counting up. */
  trend?: Trend
  /** Vertical travel of a roll, in `em`, before `distanceScale` stretches it. */
  rollDistance?: number
  /**
   * How much the character's *magnitude of change* stretches its roll. A digit
   * going `1 → 9` travels farther than `3 → 4`, so in the same duration it moves
   * faster — NumberFlow's signature. `0` makes every roll the same length.
   */
  distanceScale?: number

  /** Set `false` to render plain text with no animation. */
  animated?: boolean
  /** Honor the OS "reduce motion" setting (default `true`). */
  respectMotionPreference?: boolean
}

type KeyedChar = { key: string; char: string }

const DEFAULT_EASE: Easing = [0.22, 1, 0.36, 1]
/** Default vertical travel of a roll, in `em`, before `distanceScale` scales it. */
const DEFAULT_ROLL_DISTANCE = 0.7
/** The horizontal layout slide is independent of the roll — its own defaults. */
const DEFAULT_LAYOUT_DURATION = 0.3

/**
 * Splits a string into characters, giving each a key by *identity, not index*:
 * the Nth occurrence of a character always gets the same key across renders. So
 * a character that survives an edit keeps its key and animates from its old
 * position to its new one, while genuinely-new/removed characters enter/exit.
 * `Array.from` (not `split("")`) so surrogate pairs / emoji stay one unit.
 */
function toKeyedChars(value: string): KeyedChar[] {
  const seen = new Map<string, number>()
  return Array.from(value).map((char) => {
    const n = seen.get(char) ?? 0
    seen.set(char, n + 1)
    return { key: `${char}#${n}`, char }
  })
}

/** 0..1 magnitude of change between two characters (charcode delta, clamped). */
function charDistance(a: string | undefined, b: string | undefined): number {
  if (!a || !b || a === b) return 0
  return Math.min(1, Math.abs(a.charCodeAt(0) - b.charCodeAt(0)) / 9)
}

function staggerDelay(
  rank: number,
  count: number,
  step: number,
  from: StaggerFrom
): number {
  if (step <= 0 || count <= 1) return 0
  if (from === "last") return (count - 1 - rank) * step
  if (from === "center") return Math.abs(rank - (count - 1) / 2) * step
  return rank * step
}

/**
 * NumberFlow-style transition for *any* string. When `value` changes, characters
 * present in both the old and new value slide to their new place; the rest roll
 * in from one side and out the other with a fade — the departure-board / odometer
 * feel — cascading across the string.
 *
 * How it works: each character is two nested `motion.span`s. The *outer* owns
 * the horizontal slide — `layout="position"` FLIPs survivors to their new x with
 * a GPU transform. The *inner* owns the vertical roll + fade of enter/exit.
 * Splitting the axes keeps the roll strictly vertical instead of composing with
 * the horizontal shift into a diagonal. `AnimatePresence mode="popLayout"` pops
 * exiting characters out of flow so survivors reflow-and-slide immediately.
 * Entering characters are the only ones staggered (so single-character edits stay
 * snappy) and their roll length scales with how far the character changed
 * (`distanceScale`). Transforms + opacity only. Honors `prefers-reduced-motion`.
 */
export function CharacterFlow({
  value,
  className,
  duration = 0.6,
  ease = DEFAULT_EASE,
  enter,
  exit,
  layoutDuration = DEFAULT_LAYOUT_DURATION,
  layoutEase = DEFAULT_EASE,
  transition,
  stagger = 0.05,
  staggerFrom = "first",
  trend = "up",
  rollDistance = DEFAULT_ROLL_DISTANCE,
  distanceScale = 0.8,
  animated = true,
  respectMotionPreference = true,
}: CharacterFlowProps) {
  const reduce = useReducedMotion()
  const prevValueRef = useRef("")
  const prev = prevValueRef.current

  useEffect(() => {
    prevValueRef.current = value
  })

  if (!animated || (respectMotionPreference && reduce)) {
    return <span className={className}>{value}</span>
  }

  const chars = toKeyedChars(value)
  const prevKeys = new Set(toKeyedChars(prev).map((c) => c.key))
  const prevChars = Array.from(prev)

  // Only characters that weren't here last render cascade; rank them among
  // themselves so appending one letter never inherits a large index delay.
  const enteringRank = new Map<string, number>()
  chars.forEach((c) => {
    if (!prevKeys.has(c.key)) enteringRank.set(c.key, enteringRank.size)
  })
  const enteringCount = enteringRank.size

  const dir = trend === "up" ? 1 : -1
  const enterT: FlowTiming = { duration, ease, ...enter }
  // Horizontal slide has its own defaults so roll speed and layout speed tune
  // independently.
  const moveT: FlowTiming = {
    duration: layoutDuration,
    ease: layoutEase,
    ...transition,
  }
  // Exit rolls out (upward) as the replacement rolls in beneath it — at a
  // changed slot that reads as one letter scrolling to the next, so a full
  // non-matching swap looks like every letter scrolling rather than the whole
  // word blinking out and a new one appearing.
  const exitT: FlowTiming = { duration, ease, ...exit }

  return (
    <span className={cn("relative inline-flex", className)} aria-label={value}>
      <AnimatePresence mode="popLayout" initial={false}>
        {chars.map(({ key, char }, i) => {
          const rank = enteringRank.get(key)
          const isEntering = rank !== undefined
          // Bigger character change → longer travel → faster apparent roll.
          const travel =
            rollDistance *
            (1 + distanceScale * charDistance(prevChars[i], char))
          const delay = isEntering
            ? staggerDelay(rank, enteringCount, stagger, staggerFrom) +
              (enterT.delay ?? 0)
            : 0

          return (
            <motion.span
              key={key}
              layout="position"
              aria-hidden
              className="inline-block whitespace-pre"
              transition={{ layout: moveT }}
            >
              <motion.span
                className="inline-block whitespace-pre"
                initial={{ opacity: 0, y: `${dir * travel}em` }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  y: `${-dir * rollDistance}em`,
                  transition: exitT,
                }}
                transition={{ ...enterT, delay }}
              >
                {char}
              </motion.span>
            </motion.span>
          )
        })}
      </AnimatePresence>
    </span>
  )
}
