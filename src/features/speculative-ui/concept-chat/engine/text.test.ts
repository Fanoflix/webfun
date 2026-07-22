import { describe, expect, it } from "vitest"

import { countGraphemes, isJumboEmoji } from "./text"

describe("countGraphemes", () => {
  it("counts plain characters", () => {
    expect(countGraphemes("abc")).toBe(3)
  })

  it("counts a surrogate-pair emoji as one", () => {
    expect(countGraphemes("🔥")).toBe(1)
  })

  it("counts a ZWJ sequence as one, not its parts", () => {
    // The thing `.length` gets catastrophically wrong: this is 11 UTF-16 units.
    expect(countGraphemes("👩‍👩‍👧‍👦")).toBe(1)
  })

  it("counts a skin-tone modifier as part of its emoji", () => {
    expect(countGraphemes("👍🏽")).toBe(1)
  })
})

describe("isJumboEmoji", () => {
  it("accepts a short burst of emoji", () => {
    expect(isJumboEmoji("🔥")).toBe(true)
    expect(isJumboEmoji("🔥🔥")).toBe(true)
    expect(isJumboEmoji("😂👀💯")).toBe(true)
  })

  it("ignores surrounding whitespace", () => {
    expect(isJumboEmoji("  🔥  ")).toBe(true)
    expect(isJumboEmoji("🔥 🔥")).toBe(true)
  })

  it("rejects more than three", () => {
    expect(isJumboEmoji("🔥🔥🔥🔥")).toBe(false)
  })

  it("rejects anything with words in it", () => {
    expect(isJumboEmoji("nice 🔥")).toBe(false)
    expect(isJumboEmoji("🔥!")).toBe(false)
  })

  it("rejects digits, which are technically emoji components", () => {
    // `\p{Emoji_Component}` matches ASCII digits because of keycap sequences —
    // this is the case that catches a naive implementation.
    expect(isJumboEmoji("123")).toBe(false)
    expect(isJumboEmoji("#")).toBe(false)
  })

  it("rejects empty and whitespace-only text", () => {
    expect(isJumboEmoji("")).toBe(false)
    expect(isJumboEmoji("   ")).toBe(false)
  })

  it("counts a ZWJ family as one emoji, not several", () => {
    expect(isJumboEmoji("👩‍👩‍👧‍👦")).toBe(true)
  })
})
