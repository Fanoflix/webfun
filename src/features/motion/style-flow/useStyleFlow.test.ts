import { describe, expect, it } from "vitest"

import type { StyleFlowConfig } from "./useStyleFlow"
import { ALL_TRACKS, buildStyleFlow, buildStyleFlowTurns } from "./useStyleFlow"

function makeConfig(over: Partial<StyleFlowConfig> = {}): StyleFlowConfig {
  return {
    tracks: ALL_TRACKS,
    weights: [500, 600, 700],
    slants: [0, 1],
    families: [0, 1],
    sizeRange: [14, 15],
    cooldown: 1,
    trackPick: "random",
    seed: 1,
    duration: 6,
    stepInterval: 0.6,
    stepDuration: 0.42,
    stagger: 0.12,
    staggerFrom: "first",
    rest: { weight: 500, slant: 0, family: 0, size: 14 },
    ...over,
  }
}

describe("StyleFlow scheduler — cooldown rule", () => {
  it("never lets a track change again within `cooldown` turns", () => {
    for (const cooldown of [1, 2, 3]) {
      const cfg = makeConfig({ cooldown, seed: 42 })
      const perChar = buildStyleFlowTurns("Typography", cfg)

      for (const turns of perChar) {
        const lastTurnFor = new Map<string, number>()
        for (const { turn, track } of turns) {
          const prev = lastTurnFor.get(track)
          if (prev !== undefined) {
            // The whole rule: a re-visit must be strictly more than `cooldown`
            // turns after the previous change to the same track.
            expect(turn - prev).toBeGreaterThan(cooldown)
          }
          lastTurnFor.set(track, turn)
        }
      }
    }
  })

  it("changes exactly one track per turn (turn indices are unique)", () => {
    const perChar = buildStyleFlowTurns("Variable", makeConfig())
    for (const turns of perChar) {
      const seen = new Set(turns.map((t) => t.turn))
      expect(seen.size).toBe(turns.length)
    }
  })

  it("every scheduled change actually moves its track", () => {
    const perChar = buildStyleFlowTurns("Fraunces", makeConfig({ seed: 7 }))
    for (const turns of perChar) {
      for (const { from, to } of turns) expect(from).not.toBe(to)
    }
  })
})

describe("StyleFlow scheduler — determinism & finiteness", () => {
  it("is deterministic for a given seed", () => {
    const a = buildStyleFlowTurns("Recursive", makeConfig({ seed: 99 }))
    const b = buildStyleFlowTurns("Recursive", makeConfig({ seed: 99 }))
    expect(a).toEqual(b)
  })

  it("produces a different shimmer for a different seed", () => {
    const a = buildStyleFlowTurns("Recursive", makeConfig({ seed: 1 }))
    const b = buildStyleFlowTurns("Recursive", makeConfig({ seed: 2 }))
    expect(a).not.toEqual(b)
  })

  it("settles every track back to rest at the end of the run", () => {
    const rest = { weight: 600, slant: 0, family: 0, size: 14 }
    const schedules = buildStyleFlow("Shimmer", makeConfig({ rest }))
    for (const s of schedules) {
      for (const track of ALL_TRACKS) {
        const timeline = s[track]
        const lastTime = timeline.times[timeline.times.length - 1]
        const lastValue = timeline.values[timeline.values.length - 1]
        expect(lastTime).toBeCloseTo(1) // normalised to the full duration
        expect(lastValue).toBe(rest[track])
      }
    }
  })

  it("keeps every timeline within a normalised, monotonic [0,1] range", () => {
    const schedules = buildStyleFlow("Typeface", makeConfig())
    for (const s of schedules) {
      for (const track of ALL_TRACKS) {
        const { times } = s[track]
        expect(times[0]).toBe(0)
        for (let i = 1; i < times.length; i++) {
          expect(times[i]).toBeGreaterThanOrEqual(times[i - 1])
          expect(times[i]).toBeLessThanOrEqual(1 + 1e-9)
        }
      }
    }
  })

  it("leaves disabled tracks pinned at their rest value", () => {
    const schedules = buildStyleFlow(
      "Weightless",
      makeConfig({ tracks: ["weight"] })
    )
    for (const s of schedules) {
      expect(new Set(s.slant.values)).toEqual(new Set([0]))
      expect(new Set(s.family.values)).toEqual(new Set([0]))
      expect(new Set(s.size.values)).toEqual(new Set([14]))
    }
  })
})
