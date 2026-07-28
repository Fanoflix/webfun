/**
 * Beats: the projection a timeline message is played from.
 *
 * A message body stays a flat `Segment[]` on disk and in state. Beats are derived
 * on the way to the screen, the same way `grouping.ts` derives author runs — the
 * view never groups, and there is never a second representation to keep in sync.
 *
 * The rule, in one line: **timing starts a beat, no timing joins the one before.**
 */

import { DEFAULT_BEAT_ENTER, DEFAULT_HOLD_MS } from "./defaults"
import type { BeatEnter, Message, Segment, Timing } from "./types"

export type Beat = {
  /** Stable within a message: the index of the segment that opened the beat. */
  id: string
  segments: Segment[]
  /** Milliseconds this beat holds before the next lands. Ignored on the last. */
  hold: number
  enter: BeatEnter
}

/**
 * Split a body into beats.
 *
 * The first segment always opens a beat whether or not it carries timing, so a
 * static body yields exactly one beat containing everything — which is v0's render,
 * reached through the same code path.
 */
export function toBeats(body: Segment[]): Beat[] {
  const beats: Beat[] = []

  body.forEach((segment, index) => {
    const opensBeat = index === 0 || segment.timing !== undefined
    if (opensBeat) {
      beats.push({
        id: String(index),
        segments: [segment],
        hold: segment.timing?.hold ?? DEFAULT_HOLD_MS,
        enter: segment.timing?.enter ?? DEFAULT_BEAT_ENTER,
      })
      return
    }
    // Guaranteed present: index > 0 means at least one beat was pushed above.
    beats[beats.length - 1].segments.push(segment)
  })

  return beats
}

/**
 * Collapse beats back into a body — what the composer sends.
 *
 * Timing is written onto each beat's opening segment and stripped from the rest,
 * so `toBeats(flatten(beats))` is the identity on structure. A single beat flattens
 * to a body with no timing at all, which is precisely a plain message.
 */
export function flatten(beats: Beat[]): Segment[] {
  return beats.flatMap((beat) =>
    beat.segments.map((segment, segmentIndex) => {
      if (segmentIndex > 0) return withoutTiming(segment)
      // One beat is a static message; timing on it would mean nothing.
      if (beats.length === 1) return withoutTiming(segment)
      return withTiming(segment, { hold: beat.hold, enter: beat.enter })
    })
  )
}

/**
 * How long the whole thing runs, in ms.
 *
 * The final beat's hold is excluded — it's a gap before a beat that doesn't exist.
 */
export function totalDurationMs(beats: Beat[]): number {
  return beats.slice(0, -1).reduce((total, beat) => total + beat.hold, 0)
}

/**
 * Whether this message performs itself. A one-beat timeline message is possible
 * and harmless — it plays instantly — but `mode` is what decides, never the shape.
 */
export function isTimeline(message: Message): boolean {
  return message.mode === "timeline"
}

function withTiming(segment: Segment, timing: Timing): Segment {
  return { ...segment, timing }
}

/** Rebuilt without the key rather than set to `undefined`, so it survives JSON. */
function withoutTiming(segment: Segment): Segment {
  const { timing: _timing, ...rest } = segment
  return rest
}
