import { useEffect, useRef } from "react"
import type { MutableRefObject } from "react"
import type { Easing } from "motion/react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

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

/** One character position, carrying an id that is stable across value changes. */
type Slot = { id: number; char: string }

const DEFAULT_EASE: Easing = [0.22, 1, 0.36, 1]
/** Default vertical travel of a roll, in `em`, before `distanceScale` scales it. */
const DEFAULT_ROLL_DISTANCE = 0.7
/** The horizontal layout slide is independent of the roll — its own defaults. */
const DEFAULT_LAYOUT_DURATION = 0.3

/**
 * Longest-common-subsequence anchors between two glyph arrays, as `(ai, bi)`
 * index pairs in increasing order — the characters that are genuinely the *same*
 * across the change (e.g. the "Lich" run shared by two words). Order-preserving,
 * so anchors never cross, and contiguous runs match as a block.
 */
function lcsPairs(a: string[], b: string[]): { ai: number; bi: number }[] {
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  )
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const pairs: { ai: number; bi: number }[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push({ ai: i, bi: j })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++
    } else {
      j++
    }
  }
  return pairs
}

/**
 * Assign each character of `value` a slot: matched characters (per LCS against
 * the previously-shown slots) keep the old slot's id so they animate as the same
 * element, and only genuinely new characters get a fresh id. This is what keeps a
 * shared run like "Lich" stable instead of its letters cross-matching duplicates
 * elsewhere in the string.
 */
function reconcile(
  prev: Slot[],
  value: string,
  idRef: MutableRefObject<number>
): Slot[] {
  const nextChars = Array.from(value)
  const pairs = lcsPairs(
    prev.map((s) => s.char),
    nextChars
  )
  const prevForNext = new Map<number, number>()
  for (const { ai, bi } of pairs) prevForNext.set(bi, ai)

  return nextChars.map((char, j) => {
    const pi = prevForNext.get(j)
    return pi !== undefined
      ? { id: prev[pi].id, char }
      : { id: idRef.current++, char }
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
  duration = 0.7,
  ease = DEFAULT_EASE,
  enter,
  exit,
  layoutDuration = DEFAULT_LAYOUT_DURATION,
  layoutEase = DEFAULT_EASE,
  transition,
  stagger = 0,
  staggerFrom = "first",
  trend = "up",
  rollDistance = DEFAULT_ROLL_DISTANCE,
  distanceScale = 0.8,
  animated = true,
  respectMotionPreference = true,
}: CharacterFlowProps) {
  const reduce = useReducedMotion()
  const idRef = useRef(0)
  const prevSlotsRef = useRef<Slot[] | null>(null)
  if (prevSlotsRef.current === null) {
    prevSlotsRef.current = Array.from(value).map((char) => ({
      id: idRef.current++,
      char,
    }))
  }
  const prevSlots = prevSlotsRef.current
  // Stable-id slots for the current value: matched characters reuse their id
  // (via LCS), so a shared run stays one set of elements that just slide.
  const slots = reconcile(prevSlots, value, idRef)

  useEffect(() => {
    prevSlotsRef.current = slots
  })

  if (!animated || (respectMotionPreference && reduce)) {
    return <span className={className}>{value}</span>
  }

  const prevChars = prevSlots.map((s) => s.char)
  const prevIds = new Set(prevSlots.map((s) => s.id))

  // Only characters that weren't here last render cascade; rank them among
  // themselves so appending one letter never inherits a large index delay.
  const enteringRank = new Map<number, number>()
  slots.forEach((s) => {
    if (!prevIds.has(s.id)) enteringRank.set(s.id, enteringRank.size)
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
        {slots.map(({ id, char }, i) => {
          const rank = enteringRank.get(id)
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
              key={id}
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
