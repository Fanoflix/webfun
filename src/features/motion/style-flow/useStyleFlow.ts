import { useMemo } from "react"
import type { Easing } from "motion/react"

/**
 * The four independent style dimensions a character can drift across. Each is a
 * "track": at every turn the scheduler moves exactly one track to a new value.
 *
 * - `weight` — font weight (medium / semibold / bold), a discrete set.
 * - `slant`  — upright ↔ italic, animated 0..1 (smooth oblique on the sans face).
 * - `family` — sans ↔ serif, animated 0..1 as a crossfade between two faces.
 * - `size`   — font size within a *tight* range (default 14–15px), continuous.
 */
export type TrackName = "weight" | "slant" | "family" | "size"

export const ALL_TRACKS: TrackName[] = ["weight", "slant", "family", "size"]

/** How the scheduler chooses which eligible track to move on each turn. */
export type TrackPick = "random" | "roundRobin"

/** The canonical style a character starts from and settles back to. */
export type RestStyle = {
  /** Font weight. */
  weight: number
  /** 0 = upright, 1 = fully italic. */
  slant: number
  /** 0 = sans, 1 = serif. */
  family: number
  /** Font size, px. */
  size: number
}

/**
 * One track's animation curve for one character: `values[i]` is reached at the
 * normalised time `times[i]` (0..1 across the whole run). Flat runs of equal
 * values are the "holds" between changes; each change is a two-point ramp whose
 * length is `stepDuration`.
 */
export type TrackTimeline = { times: number[]; values: number[] }

/** Everything one character needs to animate: a timeline per track. */
export type CharSchedule = {
  char: string
  weight: TrackTimeline
  slant: TrackTimeline
  family: TrackTimeline
  size: TrackTimeline
}

export type StyleFlowConfig = {
  /** Which tracks may change. Others stay pinned at their rest value. */
  tracks: TrackName[]
  /** Discrete weight steps to pick from, e.g. `[500, 600, 700]`. */
  weights: number[]
  /** Which slant endpoints are allowed (`0` upright, `1` italic). */
  slants: number[]
  /** Which family endpoints are allowed (`0` sans, `1` serif). */
  families: number[]
  /** `[min, max]` font size in px. Kept tight on purpose. */
  sizeRange: [number, number]
  /** Turns a track must sit out after moving before it may move again. */
  cooldown: number
  trackPick: TrackPick
  /** Base RNG seed — same seed ⇒ identical shimmer (SSR-safe, reproducible). */
  seed: number
  /** Total run length in seconds. Finite: the whole thing ends and settles. */
  duration: number
  /** Seconds between the *start* of consecutive turns for one character. */
  stepInterval: number
  /** Seconds one track transition takes. */
  stepDuration: number
  /** Seconds between adjacent characters' first turn. `0` disables the cascade. */
  stagger: number
  staggerFrom: "first" | "last" | "center"
  /** The style every character starts from and eases back to at the end. */
  rest: RestStyle
}

/** Small, fast, seedable PRNG — deterministic so server and client agree. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Mix the global seed with a character index into a distinct stream seed. */
function hashSeed(seed: number, index: number): number {
  let h = (seed ^ (index * 0x9e3779b1)) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  return (h ^ (h >>> 16)) >>> 0
}

/** Delay (seconds) before a character's first turn, per the cascade origin. */
function staggerDelay(
  rank: number,
  count: number,
  step: number,
  from: "first" | "last" | "center"
): number {
  if (step <= 0 || count <= 1) return 0
  if (from === "last") return (count - 1 - rank) * step
  if (from === "center") return Math.abs(rank - (count - 1) / 2) * step
  return rank * step
}

/** Pick a member of `set` other than `current` (falls back to current if none). */
function pickDiscrete(
  set: number[],
  current: number,
  rng: () => number
): number {
  const others = set.filter((v) => v !== current)
  if (others.length === 0) return current
  return others[Math.floor(rng() * others.length)]
}

/** Pick a new size in range, biased to jump far enough that the change reads. */
function pickSize(
  [min, max]: [number, number],
  current: number,
  rng: () => number
): number {
  const span = max - min
  if (span <= 0) return min
  const minDelta = span * 0.4
  for (let tries = 0; tries < 6; tries++) {
    const next = min + rng() * span
    if (Math.abs(next - current) >= minDelta) return next
  }
  // Give up gracefully: hop to the far end.
  return current - min < span / 2 ? max : min
}

function valueOf(track: TrackName, state: RestStyle): number {
  return state[track]
}

/** One scheduled change: on `turn` (at `time` seconds) `track` goes `from`→`to`. */
export type Turn = {
  turn: number
  time: number
  track: TrackName
  from: number
  to: number
}

/**
 * Schedule one character's turns. Walks the run turn by turn; on each turn it
 * moves exactly one *eligible* track (one that has waited out its `cooldown`) to
 * a fresh value. This is the whole "no track twice in a row" rule: after a track
 * moves on turn `k`, it is barred until turn `k + cooldown + 1`, so with
 * `cooldown = 1` at least one other track must move in between. All turns land
 * before the settle window so the run can ease home to `rest` and stop.
 */
function scheduleTurns(
  charIndex: number,
  charCount: number,
  cfg: StyleFlowConfig
): { turns: Turn[]; changeWindowEnd: number } {
  const rng = mulberry32(hashSeed(cfg.seed, charIndex))
  const { rest, tracks, cooldown, duration, stepInterval, stepDuration } = cfg

  const settle = Math.min(Math.max(stepDuration, 0.01), duration)
  const changeWindowEnd = Math.max(0, duration - settle)
  const startDelay = Math.min(
    staggerDelay(charIndex, charCount, cfg.stagger, cfg.staggerFrom),
    Math.max(0, changeWindowEnd - stepDuration)
  )

  // Live style + per-track bookkeeping for the cooldown rule.
  const state: RestStyle = { ...rest }
  const lastStep: Record<TrackName, number> = {
    weight: -Infinity,
    slant: -Infinity,
    family: -Infinity,
    size: -Infinity,
  }

  const turns: Turn[] = []
  let rr = 0 // round-robin cursor
  let lastChanged: TrackName | null = null

  for (let k = 0; ; k++) {
    const t = startDelay + k * stepInterval
    if (t + stepDuration > changeWindowEnd) break

    let eligible = tracks.filter((tr) => k - lastStep[tr] > cooldown)
    if (eligible.length === 0) {
      // Too few tracks for the cooldown — relax to "anything but the last one".
      eligible = tracks.filter((tr) => tr !== lastChanged)
      if (eligible.length === 0) continue
    }

    const track =
      cfg.trackPick === "roundRobin"
        ? eligible[rr++ % eligible.length]
        : eligible[Math.floor(rng() * eligible.length)]

    const current = valueOf(track, state)
    let next: number
    if (track === "weight") next = pickDiscrete(cfg.weights, current, rng)
    else if (track === "slant") next = pickDiscrete(cfg.slants, current, rng)
    else if (track === "family") next = pickDiscrete(cfg.families, current, rng)
    else next = pickSize(cfg.sizeRange, current, rng)

    if (next === current) continue // nothing to show; don't burn the cooldown

    turns.push({ turn: k, time: t, track, from: current, to: next })
    state[track] = next
    lastStep[track] = k
    lastChanged = track
  }

  return { turns, changeWindowEnd }
}

/** Turn a character's turn log into a keyframe timeline per track. */
function buildCharSchedule(
  char: string,
  charIndex: number,
  charCount: number,
  cfg: StyleFlowConfig
): CharSchedule {
  const { rest, duration, stepDuration } = cfg
  const { turns, changeWindowEnd } = scheduleTurns(charIndex, charCount, cfg)

  // Seed every track's keyframes at rest so holds and inactive tracks are flat.
  const times: Record<TrackName, number[]> = {
    weight: [0],
    slant: [0],
    family: [0],
    size: [0],
  }
  const values: Record<TrackName, number[]> = {
    weight: [rest.weight],
    slant: [rest.slant],
    family: [rest.family],
    size: [rest.size],
  }

  // Each turn is a two-point ramp: hold at the old value until the turn, then
  // ease to the new value over `stepDuration`. Flat runs between are the holds.
  for (const { time, track, from, to } of turns) {
    times[track].push(time, time + stepDuration)
    values[track].push(from, to)
  }

  // Settle: ease every track back to its rest value by the end of the run.
  for (const tr of ALL_TRACKS) {
    const last = values[tr][values[tr].length - 1]
    if (last !== rest[tr]) {
      times[tr].push(changeWindowEnd, duration)
      values[tr].push(last, rest[tr])
    } else if (times[tr][times[tr].length - 1] < duration) {
      times[tr].push(duration)
      values[tr].push(last)
    }
  }

  const finalize = (tr: TrackName): TrackTimeline => ({
    times: times[tr].map((x) => x / duration),
    values: values[tr],
  })

  return {
    char,
    weight: finalize("weight"),
    slant: finalize("slant"),
    family: finalize("family"),
    size: finalize("size"),
  }
}

/** Build a schedule for every character of `value`. Pure + deterministic. */
export function buildStyleFlow(
  value: string,
  cfg: StyleFlowConfig
): CharSchedule[] {
  const chars = Array.from(value)
  return chars.map((char, i) => buildCharSchedule(char, i, chars.length, cfg))
}

/**
 * The raw turn log for every character — one array of {@link Turn}s per glyph.
 * Exposed for tests and introspection (the keyframe timelines in
 * {@link buildStyleFlow} are derived from exactly this).
 */
export function buildStyleFlowTurns(
  value: string,
  cfg: StyleFlowConfig
): Turn[][] {
  const chars = Array.from(value)
  return chars.map((_, i) => scheduleTurns(i, chars.length, cfg).turns)
}

/** Memoised schedule — rebuilds only when the value or config changes. */
export function useStyleFlow(
  value: string,
  cfg: StyleFlowConfig
): CharSchedule[] {
  return useMemo(
    () => buildStyleFlow(value, cfg),
    [
      value,
      cfg.tracks.join(","),
      cfg.weights.join(","),
      cfg.slants.join(","),
      cfg.families.join(","),
      cfg.sizeRange[0],
      cfg.sizeRange[1],
      cfg.cooldown,
      cfg.trackPick,
      cfg.seed,
      cfg.duration,
      cfg.stepInterval,
      cfg.stepDuration,
      cfg.stagger,
      cfg.staggerFrom,
      cfg.rest.weight,
      cfg.rest.slant,
      cfg.rest.family,
      cfg.rest.size,
    ]
  )
}

export type { Easing }
