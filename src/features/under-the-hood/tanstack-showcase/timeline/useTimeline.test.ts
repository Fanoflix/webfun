// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { Flow, ShowcaseEvent } from "../engine/types"
import { useTimeline } from "./useTimeline"

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

describe("useTimeline row cap", () => {
  it("keeps every row while under the limit", () => {
    const flows = Array.from({ length: 4 }, (_, i) =>
      requestFlow(`click ${i}`, `/a/${i}`)
    )
    const { result } = renderHook(() => useTimeline(flows, 0))

    expect(rowsOf(result.current)).toHaveLength(4)
  })

  it("tails to the newest rows once the limit is passed", () => {
    const flows = Array.from({ length: 14 }, (_, i) =>
      requestFlow(`click ${i}`, `/a/${i}`)
    )
    const { result } = renderHook(() => useTimeline(flows, 0))
    const rows = rowsOf(result.current)

    // One falls off the top for each that arrives at the bottom.
    expect(rows).toHaveLength(10)
    expect(rows[0].name).toBe("/a/4")
    expect(rows.at(-1)?.name).toBe("/a/13")
  })

  it("drops segments that have been emptied, rather than leaving stray labels", () => {
    const flows = Array.from({ length: 14 }, (_, i) =>
      requestFlow(`click ${i}`, `/a/${i}`)
    )
    const { result } = renderHook(() => useTimeline(flows, 0))

    expect(result.current.segments).toHaveLength(10)
    expect(result.current.segments[0].label).toBe("click 4")
  })

  it("counts only the rows it is still showing", () => {
    const flows = Array.from({ length: 14 }, (_, i) =>
      requestFlow(`click ${i}`, `/a/${i}`)
    )
    const { result } = renderHook(() => useTimeline(flows, 0))

    expect(result.current.requestCount).toBe(10)
  })
})
