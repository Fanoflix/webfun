import { describe, expect, it } from "vitest"

import {
  REPLAY_BURST_COUNT,
  REPLAY_BURST_TYPING_MS,
  REPLAY_FIRST_TYPING_MS,
  REPLAY_TYPING_MS,
  replayTypingFor,
} from "./defaults"
import { SEED_LINES } from "./seed"

describe("replayTypingFor", () => {
  it("gives the opener the long pause", () => {
    expect(replayTypingFor(0)).toBe(REPLAY_FIRST_TYPING_MS)
  })

  it("rattles off the burst that follows", () => {
    // Derived from the constant rather than hardcoded, so tuning the burst
    // length stays a one-number change.
    for (let i = 1; i <= REPLAY_BURST_COUNT; i++) {
      expect(replayTypingFor(i)).toBe(REPLAY_BURST_TYPING_MS)
    }
  })

  it("settles back to a normal pace afterwards", () => {
    expect(replayTypingFor(REPLAY_BURST_COUNT + 1)).toBe(REPLAY_TYPING_MS)
    expect(replayTypingFor(10)).toBe(REPLAY_TYPING_MS)
  })

  it("covers the seed with a burst and at least one line after it", () => {
    // The shape only reads as "quick burst, then back" if the script is long
    // enough to have an "after". Adding or cutting seed lines can break that
    // silently, so it's asserted rather than assumed.
    expect(SEED_LINES.length).toBeGreaterThan(REPLAY_BURST_COUNT + 1)
  })
})
