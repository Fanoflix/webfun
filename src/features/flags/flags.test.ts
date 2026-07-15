import { describe, expect, it } from "vitest"

import { isToolKey, parseReleased, toolFromPathname } from "./flags"

describe("parseReleased", () => {
  it("reads a comma-separated slug list", () => {
    expect(parseReleased("dithering,anti-aliasing")).toEqual([
      "dithering",
      "anti-aliasing",
    ])
  })

  it("tolerates whitespace around slugs", () => {
    expect(parseReleased(" dithering , style-flow ")).toEqual([
      "dithering",
      "style-flow",
    ])
  })

  it("drops unknown slugs rather than trusting a typo", () => {
    // A fat-fingered env var must never release a tool that doesn't exist, and
    // must not take the real ones down with it.
    expect(parseReleased("dithring,dithering")).toEqual(["dithering"])
  })

  it("treats unset/empty as nothing released (fails closed)", () => {
    expect(parseReleased(undefined)).toEqual([])
    expect(parseReleased("")).toEqual([])
  })
})

describe("isToolKey", () => {
  it("accepts real tools and rejects anything else", () => {
    expect(isToolKey("style-flow")).toBe(true)
    expect(isToolKey("nope")).toBe(false)
    expect(isToolKey("")).toBe(false)
  })
})

describe("toolFromPathname", () => {
  it("maps a tool route to its key", () => {
    expect(toolFromPathname("/style-flow")).toBe("style-flow")
    expect(toolFromPathname("/anti-aliasing")).toBe("anti-aliasing")
  })

  it("tolerates a trailing slash", () => {
    expect(toolFromPathname("/style-flow/")).toBe("style-flow")
  })

  it("returns null for non-tool pages", () => {
    expect(toolFromPathname("/")).toBeNull()
    expect(toolFromPathname("/whatever")).toBeNull()
  })

  it("expects a basepath-relative path, which is what the router hands us", () => {
    // The site is served under /webfun on GitHub Pages, but TanStack Router's
    // `rewriteBasepath` strips that prefix before the location reaches state —
    // so `location.pathname` is "/style-flow", never "/webfun/style-flow".
    // This asserts the contract: if a future change ever passed the *raw*
    // browser path in here, the gate would fail OPEN (null = "not a tool" =
    // always visible), and this test is the tripwire for that.
    expect(toolFromPathname("/webfun/style-flow")).toBeNull()
  })
})
