import { useCallback, useEffect, useRef, useState } from "react"

import type { Beat } from "./beats"

/**
 * Plays a timeline message: beats land one after another and stay.
 *
 * The performance is entirely "how many beats are visible" — because beats
 * accumulate rather than replace, there is no current-beat to track, nothing to
 * tear down between steps, and no way for two things to be on screen at once.
 *
 * Timers are owned in a ref and cleared as a set, the same shape as
 * `useFakeChatter`. An idle message runs no timers at all: the only effect here is
 * unmount cleanup, and it exists because a pending timeout that outlives the
 * component would set state on a corpse.
 */

export type PlaybackPhase = "idle" | "playing" | "done"

export type TimelinePlayback = {
  phase: PlaybackPhase
  /** How many beats to render. `1` while idle — the poster is the first beat. */
  visibleCount: number
  play: () => void
  /** Back to the poster, then straight into playing again. */
  replay: () => void
}

export function useTimelinePlayback(
  beats: Beat[],
  {
    initiallyDone = false,
    onBeatLand,
    onFinish,
  }: {
    /** A message that already played comes back finished, not waiting. */
    initiallyDone?: boolean
    /** Fired as each beat lands, so the thread can keep itself scrolled. */
    onBeatLand?: () => void
    onFinish?: () => void
  } = {}
): TimelinePlayback {
  const [phase, setPhase] = useState<PlaybackPhase>(
    initiallyDone ? "done" : "idle"
  )
  const [visibleCount, setVisibleCount] = useState(
    initiallyDone ? beats.length : 1
  )

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  useEffect(() => clearAll, [clearAll])

  /**
   * Callbacks live in a ref so the schedule doesn't have to be rebuilt — and the
   * playback restarted — every time a parent re-renders with a new closure.
   */
  const handlers = useRef({ onBeatLand, onFinish })
  handlers.current = { onBeatLand, onFinish }

  const start = useCallback(() => {
    clearAll()
    setVisibleCount(1)
    setPhase("playing")
    handlers.current.onBeatLand?.()

    if (beats.length <= 1) {
      setPhase("done")
      handlers.current.onFinish?.()
      return
    }

    /**
     * Every beat is scheduled up front against one cumulative offset rather than
     * chained one timeout at a time. Chaining accumulates each timer's lateness
     * into the next, so a long message drifts further behind its own timings the
     * further it gets.
     */
    let offset = 0
    beats.slice(0, -1).forEach((beat, index) => {
      offset += beat.hold
      const isLast = index === beats.length - 2
      timers.current.push(
        setTimeout(() => {
          setVisibleCount(index + 2)
          handlers.current.onBeatLand?.()
          if (isLast) {
            setPhase("done")
            handlers.current.onFinish?.()
          }
        }, offset)
      )
    })
  }, [beats, clearAll])

  return { phase, visibleCount, play: start, replay: start }
}
