// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { Flow, ShowcaseEvent } from "../engine/types"
import { MAX_LOGGING_ROWS, useTimeline } from "./useTimeline"

let seq = 0

/** One completed request, which builds exactly one row. */
function requestFlow(label: string, endpoint: string): Flow {
  const at = 0
  const event = (
    kind: ShowcaseEvent["kind"],
    offset: number
  ): ShowcaseEvent => ({
    id: `e${seq++}`,
    kind,
    node: "server",
    label: kind,
    detail: endpoint,
    trace: endpoint,
    at: at + offset,
  })
  return {
    id: `f${seq++}`,
    label,
    kind: "interaction",
    startedAt: 0,
    events: [event("server:receive", 0), event("server:respond", 10)],
  }
}

const rowsOf = (timeline: ReturnType<typeof useTimeline>) =>
  timeline.segments.flatMap((segment) => segment.rows)

/** Comfortably past the cap, whatever the cap happens to be. */
const OVERFLOW = 4
const OVER_LIMIT_COUNT = MAX_LOGGING_ROWS + OVERFLOW
const overLimitFlows = Array.from({ length: OVER_LIMIT_COUNT }, (_, i) =>
  requestFlow(`click ${i}`, `/a/${i}`)
)

describe("useTimeline row cap", () => {
  it("keeps every row while under the limit", () => {
    const flows = Array.from({ length: 4 }, (_, i) =>
      requestFlow(`click ${i}`, `/a/${i}`)
    )
    const { result } = renderHook(() => useTimeline(flows, 0))

    expect(rowsOf(result.current)).toHaveLength(4)
  })

  it("tails to the newest rows once the limit is passed", () => {
    const { result } = renderHook(() => useTimeline(overLimitFlows, 0))
    const rows = rowsOf(result.current)

    // One falls off the top for each that arrives at the bottom. Expectations
    // are derived from the constant, so tuning the cap doesn't fail the suite.
    expect(rows).toHaveLength(MAX_LOGGING_ROWS)
    expect(rows[0].name).toBe(`/a/${OVERFLOW}`)
    expect(rows.at(-1)?.name).toBe(`/a/${OVER_LIMIT_COUNT - 1}`)
  })

  it("drops segments that have been emptied, rather than leaving stray labels", () => {
    const { result } = renderHook(() => useTimeline(overLimitFlows, 0))

    expect(result.current.segments).toHaveLength(MAX_LOGGING_ROWS)
    expect(result.current.segments[0].label).toBe(`click ${OVERFLOW}`)
  })

  it("counts only the rows it is still showing", () => {
    const { result } = renderHook(() => useTimeline(overLimitFlows, 0))

    expect(result.current.requestCount).toBe(MAX_LOGGING_ROWS)
  })
})
