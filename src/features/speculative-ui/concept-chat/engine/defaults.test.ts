import { describe, expect, it } from "vitest"

import {
  REPLAY_BURST_COUNT,
  REPLAY_BURST_TYPING_MS,
  REPLAY_FIRST_TYPING_MS,
  REPLAY_TYPING_MS,
  replayTypingFor,
} from "./defaults"
import { SEED_BODIES } from "./seed"

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

  it("only has the opener to pace, now the seed is one message", () => {
    // The burst curve is kept for a seed that grows back into several messages,
    // but today the reset types once and drops one timeline message — so this
    // asserts what's actually exercised rather than a shape that isn't.
    expect(SEED_BODIES).toHaveLength(1)
  })
})
