import { describe, expect, it } from "vitest"

import { neighbourOf } from "./selection"

const list = [{ id: 1 }, { id: 2 }, { id: 3 }]

describe("neighbourOf", () => {
  it("picks the row above", () => {
    expect(neighbourOf(list, 2)).toBe(1)
    expect(neighbourOf(list, 3)).toBe(2)
  })

  it("falls to the row below when the first one goes", () => {
    expect(neighbourOf(list, 1)).toBe(2)
  })

  it("selects nothing when the last row goes", () => {
    expect(neighbourOf([{ id: 9 }], 9)).toBeNull()
  })

  it("selects nothing for a row that isn't there", () => {
    expect(neighbourOf(list, 42)).toBeNull()
  })
})
