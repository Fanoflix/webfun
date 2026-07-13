import { useCallback, useEffect, useRef, useState } from "react"

import { DEFAULT_EASE_KEY, resolveEase } from "../eases"
import type { TrackName, TrackPick } from "./useStyleFlow"
import { ALL_TRACKS } from "./useStyleFlow"

/** Default preview run length (s). */
export const DEFAULT_DURATION = 6

/** Default seconds between the start of a character's consecutive turns. */
export const DEFAULT_STEP_INTERVAL = 0.1

/** Default seconds a single track transition takes. */
export const DEFAULT_STEP_DURATION = 0.1

/** Sample strings to shuffle through. */
export const SAMPLES = [
  "Typeface",
  "Variable",
  "Fraunces",
  "Recursive",
  "Shimmer",
]

/** Human labels for each track toggle. */
export const TRACK_LABELS: Record<TrackName, string> = {
  weight: "Weight",
  slant: "Italic",
  family: "Serif",
  size: "Size",
}

/** Cooldown values offered in the demo. */
export const COOLDOWNS = [1, 2, 3]

/** Track-order strategies offered in the demo. */
export const PICKS: { key: TrackPick; label: string }[] = [
  { key: "random", label: "Random" },
  { key: "roundRobin", label: "Round-robin" },
]


/** All demo state: the text, which tracks play, the cooldown, and the looping. */
export function useStyleFlowDemo() {
  const [value, setValue] = useState(SAMPLES[0])
  const [, setSampleIndex] = useState(0)
  const [seed, setSeed] = useState(1)
  const [playToken, setPlayToken] = useState(0)
  const [cooldown, setCooldown] = useState(1)
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [stepInterval, setStepInterval] = useState(DEFAULT_STEP_INTERVAL)
  const [stepDuration, setStepDuration] = useState(DEFAULT_STEP_DURATION)
  const [trackPick, setTrackPick] = useState<TrackPick>("random")
  const [easeKey, setEaseKey] = useState(DEFAULT_EASE_KEY)
  const [looping, setLooping] = useState(true)
  const [active, setActive] = useState<Record<TrackName, boolean>>({
    weight: true,
    slant: true,
    family: true,
    size: true,
  })

  const tracks = ALL_TRACKS.filter((t) => active[t])
  const ease = resolveEase(easeKey)

  /** Re-run from the top with a fresh random shimmer. */
  const replay = useCallback(() => {
    setSeed((s) => (s + 0x9e37 + 1) >>> 0)
    setPlayToken((t) => t + 1)
  }, [])

  /** Advance to the next sample word and re-run. */
  const nextSample = useCallback(() => {
    setSampleIndex((i) => {
      const next = (i + 1) % SAMPLES.length
      setValue(SAMPLES[next])
      return next
    })
    replay()
  }, [replay])

  const toggleTrack = (track: TrackName) =>
    setActive((prev) => {
      const next = { ...prev, [track]: !prev[track] }
      // Never leave the shimmer with nothing to animate.
      if (ALL_TRACKS.every((t) => !next[t])) return prev
      return next
    })

  // Loop the finite run for the showcase (the component itself never loops).
  // Re-arms whenever the run length changes so the cadence stays in step.
  const replayRef = useRef(replay)
  replayRef.current = replay
  useEffect(() => {
    if (!looping) return
    const id = setInterval(() => replayRef.current(), duration * 1000)
    return () => clearInterval(id)
  }, [looping, duration])

  return {
    value,
    setValue,
    seed,
    playToken,
    cooldown,
    setCooldown,
    duration,
    setDuration,
    stepInterval,
    setStepInterval,
    stepDuration,
    setStepDuration,
    trackPick,
    setTrackPick,
    easeKey,
    setEaseKey,
    ease,
    looping,
    setLooping,
    active,
    toggleTrack,
    tracks,
    replay,
    nextSample,
  }
}
