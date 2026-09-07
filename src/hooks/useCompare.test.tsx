// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { useCompare } from "./useCompare"

let api: ReturnType<typeof useCompare>

function Probe() {
  api = useCompare()
  return <span data-testid="probe">{api.comparing ? "before" : "after"}</span>
}

const showing = () => screen.getByTestId("probe").textContent

afterEach(cleanup)

describe("useCompare", () => {
  it("starts on the processed image", () => {
    render(<Probe />)
    expect(showing()).toBe("after")
  })

  it("stays on the original while latched", () => {
    render(<Probe />)

    act(() => api.setLatched(true))
    expect(showing()).toBe("before")

    // No release to wait for — that is the whole point of the toggle.
    expect(api.latched).toBe(true)
  })

  it("shows the original only for the duration of a peek", () => {
    render(<Probe />)

    act(() => api.startPeek())
    expect(showing()).toBe("before")

    act(() => api.endPeek())
    expect(showing()).toBe("after")
  })

  it("flips back to the processed image when peeking while latched", () => {
    render(<Probe />)

    act(() => api.setLatched(true))
    act(() => api.startPeek())
    expect(showing()).toBe("after")

    act(() => api.endPeek())
    expect(showing()).toBe("before")
  })

  it("does not let a peek clear the latch", () => {
    render(<Probe />)

    act(() => api.setLatched(true))
    act(() => api.startPeek())
    act(() => api.endPeek())

    expect(api.latched).toBe(true)
    expect(showing()).toBe("before")
  })
})
