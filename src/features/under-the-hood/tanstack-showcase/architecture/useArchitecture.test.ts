// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { EventKind, Flow, NodeId, ShowcaseEvent } from "../engine/types"
import { useArchitecture } from "./useArchitecture"

let seq = 0

function flowOf(events: Array<[EventKind, NodeId]>): Flow {
  return {
    id: `f${seq++}`,
    label: "test",
    kind: "interaction",
    startedAt: 0,
    events: events.map(
      ([kind, node], i): ShowcaseEvent => ({
        id: `e${seq++}`,
        kind,
        node,
        label: kind,
        detail: "x",
        trace: "x",
        at: i * 10,
      })
    ),
  }
}

/** Rung 1 lays out Interface → Query → Server, so edge 0 is Interface–Query. */
const RUNG_1 = 1

describe("which way a packet travels", () => {
  it("sends an answer back towards the person, not away from them", () => {
    const { result } = renderHook(() =>
      useArchitecture([flowOf([["query:cache:hit", "query"]])], RUNG_1)
    )

    // A cache hit happens *at* Query, but what moves is the answer arriving at
    // the interface. Drawn outward it put "here's your answer, free" on the
    // path a question takes.
    expect(result.current.edges[0]?.direction).toBe("in")
  })

  it("sends a question away from the person", () => {
    const { result } = renderHook(() =>
      useArchitecture([flowOf([["query:fetch:start", "query"]])], RUNG_1)
    )

    expect(result.current.edges[0]?.direction).toBe("out")
  })

  it("draws a request to the server as one round trip", () => {
    const { result } = renderHook(() =>
      useArchitecture([flowOf([["server:receive", "server"]])], RUNG_1)
    )

    // Down and back in one motion, started by the request — the only moment
    // early enough to have it land with the data.
    expect(result.current.edges[1]?.roundTrip).toBe(true)
    expect(result.current.requestCount).toBe(1)
  })

  it("draws nothing extra when the response lands", () => {
    const { result } = renderHook(() =>
      useArchitecture(
        [
          flowOf([
            ["server:receive", "server"],
            ["server:respond", "server"],
          ]),
        ],
        RUNG_1
      )
    )

    // Still the request's packet: a second one started here would begin after
    // the data had already rendered.
    expect(result.current.edges[1]?.kind).toBe("server:receive")
  })
})

describe("markers that never moved", () => {
  it("marks a free read as not travelling", async () => {
    const { markerFor } = await import("./markers")

    // A cache hit was answered where it stood; sliding it along the line would
    // imply a journey, and at a glance look like a request.
    expect(markerFor("query:cache:hit").travels).toBe(false)
    expect(markerFor("db:live:read").travels).toBe(false)
  })

  it("keeps everything that really crossed the gap travelling", async () => {
    const { markerFor } = await import("./markers")

    expect(markerFor("server:receive").travels).toBe(true)
    expect(markerFor("query:invalidate").travels).toBe(true)
    expect(markerFor("server:reject").travels).toBe(true)
  })
})
