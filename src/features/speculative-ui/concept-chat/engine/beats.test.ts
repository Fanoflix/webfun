import { describe, expect, it } from "vitest"

import { flatten, isTimeline, toBeats, totalDurationMs } from "./beats"
import { DEFAULT_BEAT_ENTER, DEFAULT_HOLD_MS } from "./defaults"
import type { Message, Segment } from "./types"

const text = (value: string, hold?: number): Segment => ({
  kind: "text",
  text: value,
  ...(hold === undefined
    ? {}
    : { timing: { hold, enter: DEFAULT_BEAT_ENTER } }),
})

const gif: Segment = { kind: "gif", assetId: "lich" }

describe("toBeats", () => {
  it("reads a body with no timing as one beat — v0's render, unchanged", () => {
    const beats = toBeats([text("hey"), gif])

    expect(beats).toHaveLength(1)
    expect(beats[0].segments).toHaveLength(2)
  })

  it("defaults hold and enter when the opening segment carries no timing", () => {
    const [beat] = toBeats([text("hey")])

    expect(beat.hold).toBe(DEFAULT_HOLD_MS)
    expect(beat.enter).toBe(DEFAULT_BEAT_ENTER)
  })

  it("starts a new beat at every segment carrying timing", () => {
    const beats = toBeats([text("one", 800), text("two", 1_500)])

    expect(beats.map((beat) => beat.hold)).toEqual([800, 1_500])
  })

  it("joins an untimed segment to the beat before it", () => {
    const beats = toBeats([text("one", 800), gif, text("two", 1_500)])

    expect(beats).toHaveLength(2)
    expect(beats[0].segments).toEqual([text("one", 800), gif])
  })

  it("opens a beat on the first segment even when it has no timing", () => {
    const beats = toBeats([text("intro"), text("two", 800)])

    expect(beats).toHaveLength(2)
    expect(beats[0].segments).toEqual([text("intro")])
  })

  it("gives beats ids that are stable and distinct", () => {
    const beats = toBeats([text("one", 800), gif, text("two", 800)])

    expect(beats.map((beat) => beat.id)).toEqual(["0", "2"])
  })

  it("handles an empty body", () => {
    expect(toBeats([])).toEqual([])
  })
})

describe("totalDurationMs", () => {
  it("excludes the last beat's hold — nothing follows it", () => {
    const beats = toBeats([
      text("one", 800),
      text("two", 1_500),
      text("three", 5_000),
    ])

    expect(totalDurationMs(beats)).toBe(2_300)
  })

  it("is zero for a single beat", () => {
    expect(totalDurationMs(toBeats([text("one", 800)]))).toBe(0)
  })

  it("is zero for no beats", () => {
    expect(totalDurationMs([])).toBe(0)
  })
})

describe("flatten", () => {
  it("round-trips beat structure", () => {
    const body = [text("one", 800), gif, text("two", 1_500)]
    const beats = toBeats(body)

    expect(toBeats(flatten(beats))).toEqual(beats)
  })

  it("writes timing onto the opening segment only", () => {
    const beats = toBeats([text("one", 800), gif, text("two", 1_500)])
    const body = flatten(beats)

    expect(body[0].timing).toEqual({ hold: 800, enter: DEFAULT_BEAT_ENTER })
    expect(body[1].timing).toBeUndefined()
    expect(body[2].timing).toEqual({ hold: 1_500, enter: DEFAULT_BEAT_ENTER })
  })

  it("emits a plain body for a single beat — that is just a normal message", () => {
    const body = flatten(toBeats([text("one", 800), gif]))

    expect(body.every((segment) => segment.timing === undefined)).toBe(true)
  })

  it("omits the timing key rather than storing undefined, so JSON matches", () => {
    const [segment] = flatten(toBeats([text("one", 800)]))

    expect(Object.hasOwn(segment, "timing")).toBe(false)
  })
})

describe("isTimeline", () => {
  const base: Message = {
    id: "m1",
    authorId: "viewer",
    sentAt: 0,
    body: [text("hey")],
    reactions: [],
  }

  it("is false when mode is absent — every v0 message", () => {
    expect(isTimeline(base)).toBe(false)
  })

  it("follows mode, not the shape of the body", () => {
    expect(isTimeline({ ...base, mode: "timeline" })).toBe(true)
    expect(
      isTimeline({ ...base, mode: "static", body: [text("a", 800)] })
    ).toBe(false)
  })
})
