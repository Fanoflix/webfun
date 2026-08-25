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

describe("responses that arrive after you've moved on", () => {
  /**
   * Click a second ticket while the first is still loading and the reply lands
   * in the *next* segment, because events always append to the newest flow.
   * Paired per-segment, the row that asked for it sat on "pending" forever and
   * the reply was thrown away.
   */
  it("closes a row opened in an earlier segment", () => {
    const first: Flow = {
      id: "f-a",
      label: "Open ticket #1",
      kind: "interaction",
      startedAt: 0,
      events: [
        {
          id: "e-a1",
          kind: "server:receive",
          node: "server",
          label: "request received",
          detail: "/tickets/1",
          trace: "/tickets/1",
          at: 0,
        },
      ],
    }
    const second: Flow = {
      id: "f-b",
      label: "Open ticket #2",
      kind: "interaction",
      startedAt: 100,
      events: [
        {
          id: "e-b1",
          // The first ticket's reply, landing during the second interaction.
          kind: "server:respond",
          node: "server",
          label: "responded",
          detail: "/tickets/1",
          trace: "/tickets/1",
          at: 500,
        },
      ],
    }

    const { result } = renderHook(() => useTimeline([first, second], 0))
    const row = result.current.segments[0].rows[0]

    expect(row.name).toBe("/tickets/1")
    expect(row.status.kind).toBe("ok")
    // Measured across the two flows: opened at 0, answered at 100 + 500.
    expect(row.time).toBe("600ms")
  })
})
