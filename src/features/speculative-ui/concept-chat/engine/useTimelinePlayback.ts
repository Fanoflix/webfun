import { useCallback, useEffect, useRef, useState } from "react"

import type { Beat } from "./beats"
import { REPLAY_GAP_MS } from "./defaults"

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

export type PlaybackPhase = "idle" | "rewinding" | "playing" | "done"

export type TimelinePlayback = {
  phase: PlaybackPhase
  /** How many beats to render. `1` while idle — the poster is the first beat. */
  visibleCount: number
  /**
   * Increments on every run. The view keys beats off it, so starting a run
   * re-mounts them and they animate in again — including the first, which was
   * already on screen as the poster and would otherwise just sit there while
   * everything after it performed.
   */
  runId: number
  /**
   * Whether this run began from an empty message — i.e. a replay, which winds
   * everything away first.
   *
   * The first beat needs it: arriving into empty space it should grow in like
   * any other beat, but arriving over a poster of exactly its own height it
   * must only fade, or the message collapses and re-expands for nothing.
   */
  fromCleared: boolean
  play: () => void
  /** Winds the beats back down, *then* runs again. */
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
  const [runId, setRunId] = useState(0)
  const [fromCleared, setFromCleared] = useState(false)

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

  const start = useCallback(
    (cleared: boolean) => {
      clearAll()
      setVisibleCount(1)
      setRunId((id) => id + 1)
      setFromCleared(cleared)
      setPhase("playing")
      handlers.current.onBeatLand?.()

      if (beats.length <= 1) {
        setPhase("done")
        handlers.current.onFinish?.()
        return
      }

      /**
       * Every beat is scheduled up front against one cumulative offset rather
       * than chained one timeout at a time. Chaining accumulates each timer's
       * lateness into the next, so a long message drifts further behind its own
       * timings the further it gets.
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
    },
    [beats, clearAll]
  )

  const play = useCallback(() => start(false), [start])

  /**
   * Clears the message, waits, then runs it again.
   *
   * `visibleCount` goes to zero rather than one: the first beat cuts out on the
   * frame you press replay, and the beats after it collapse away over
   * `BEAT_REWIND_MS`. Then nothing, flat, until `REPLAY_GAP_MS` — the breath
   * before it starts over, held apart from the first beat's own hold so the
   * restart never depends on how the message happens to be authored.
   */
  const replay = useCallback(() => {
    clearAll()
    setPhase("rewinding")
    setVisibleCount(0)
    timers.current.push(setTimeout(() => start(true), REPLAY_GAP_MS))
  }, [clearAll, start])

  return { phase, visibleCount, runId, fromCleared, play, replay }
}
