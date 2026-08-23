// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { HintText } from "./HintText"
import { RUNGS } from "./engine/rungs"

afterEach(cleanup)

describe("HintText", () => {
  it("bolds every rung name it finds", () => {
    render(
      <HintText text="React Query still paid for it, unlike TanStack DB, and Basic never did." />
    )

    const bolded = document.querySelectorAll("strong")
    expect(Array.from(bolded).map((el) => el.textContent)).toEqual([
      "React Query",
      "TanStack DB",
      "Basic",
    ])
  })

  it("matches the longest name first", () => {
    // "TanStack DB" must not be split by a shorter name winning the race.
    render(<HintText text="TanStack DB is the last rung." />)

    expect(document.querySelector("strong")?.textContent).toBe("TanStack DB")
  })

  it("stays in step with the ladder rather than a hard-coded list", () => {
    for (const rung of RUNGS) {
      cleanup()
      render(<HintText text={`before ${rung.name} after`} />)
      expect(document.querySelector("strong")?.textContent).toBe(rung.name)
    }
  })

  it("leaves prose without rung names alone", () => {
    render(<HintText text="Every navigation asks the server again." />)

    expect(document.querySelector("strong")).toBeNull()
    expect(
      screen.getByText(/Every navigation asks the server again./)
    ).toBeDefined()
  })
})
