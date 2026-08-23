// @vitest-environment jsdom
import { StrictMode } from "react"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createEventBus } from "../engine/events"
import type { Server } from "../engine/server"
import type { Ticket } from "../engine/types"
import { RungHost } from "./RungHost"
import type { TicketsView } from "./contract"

const TICKETS: Ticket[] = [
  { id: 1, title: "One", status: "open", assignee: "sam", body: "first" },
  { id: 2, title: "Two", status: "done", assignee: "ada", body: "second" },
]

/** A server that answers instantly and counts what it was asked. */
function countingServer({ failWrites = false } = {}) {
  const calls = { list: 0, detail: [] as number[], writes: 0 }
  const server = {
    setConfig: () => {},
    listTickets: async () => {
      calls.list += 1
      return TICKETS.map((t) => ({ ...t }))
    },
    getTicket: async (id: number) => {
      calls.detail.push(id)
      return { ...TICKETS.find((t) => t.id === id)! }
    },
    createTicket: async () => {
      calls.writes += 1
      if (failWrites) throw new Error("server rejected the write")
      return TICKETS[0]
    },
    setStatus: async (id: number, status: Ticket["status"]) => {
      calls.writes += 1
      if (failWrites) throw new Error("server rejected the write")
      return { ...TICKETS.find((t) => t.id === id)!, status }
    },
    deleteTicket: async () => {
      calls.writes += 1
      if (failWrites) throw new Error("server rejected the write")
    },
  }
  return { calls, server: server as unknown as Server }
}

/** Mounts a rung and exposes the ticket count so we can await a render. */
/**
 * Holds onto the live view object so a test can call its handlers and read the
 * result. Needed for the optimistic-write assertions, which have to inspect the
 * data between the click and the server round-trip.
 */
function captureView() {
  const box: {
    current: TicketsView | null
    capture: (v: TicketsView) => void
  } = {
    current: null,
    capture: (view) => {
      box.current = view
    },
  }
  return box
}

function renderRung(
  rung: 0 | 1 | 2,
  server: Server,
  selectedId: number | null,
  strict = false,
  onView?: (view: TicketsView) => void
) {
  const bus = createEventBus()
  bus.beginFlow("test")
  const host = (id: number | null) => (
    <RungHost rung={rung} server={server} bus={bus} selectedId={id}>
      {(view) => {
        onView?.(view)
        return <div data-testid="count">{view.list.length}</div>
      }}
    </RungHost>
  )
  const ui = (id: number | null) =>
    strict ? <StrictMode>{host(id)}</StrictMode> : host(id)
  const utils = render(ui(selectedId))
  return { ...utils, rerender: (id: number | null) => utils.rerender(ui(id)) }
}

/**
 * Lets everything in flight finish, so the caller can assert nothing further
 * happened. Used only for negative assertions ("it did NOT fetch again"), where
 * there is no state change to wait for. Every positive assertion waits on the
 * real condition via `vi.waitFor`, so a loaded CI box can't make these flaky.
 */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25))
  })

/** Waits until the rendered list actually holds `n` tickets. */
const expectListSize = (n: number) =>
  vi.waitFor(() =>
    expect(screen.getByTestId("count").textContent).toBe(String(n))
  )

afterEach(cleanup)

describe("rung 0 — hand-rolled", () => {
  it("fetches the list exactly once on mount", async () => {
    const { calls, server } = countingServer()
    renderRung(0, server, null)

    await expectListSize(2)
    await settle()

    // Guards the effect wiring: a changing `loadList` identity would refetch on
    // every render, which is the classic way hand-rolled fetching goes wrong.
    // (Under React StrictMode in dev this legitimately fires twice — that's
    // StrictMode surfacing a non-resilient effect, and it does not happen in a
    // production build. jsdom here runs without it.)
    expect(calls.list).toBe(1)
  })

  it("refetches the detail on every selection, even a repeat", async () => {
    const { calls, server } = countingServer()
    const { rerender } = renderRung(0, server, null)

    rerender(1)
    await vi.waitFor(() => expect(calls.detail).toEqual([1]))
    rerender(2)
    await vi.waitFor(() => expect(calls.detail).toEqual([1, 2]))
    rerender(1)

    // No cache exists, so the same ticket costs a round-trip every time — even
    // one that was on screen a moment ago. This is what rung 1 removes.
    await vi.waitFor(() => expect(calls.detail).toEqual([1, 2, 1]))
  })
})

describe("rung 1 — TanStack Query", () => {
  it("fetches the list exactly once on mount", async () => {
    const { calls, server } = countingServer()
    renderRung(1, server, null)

    await expectListSize(2)
    await settle()

    expect(calls.list).toBe(1)
  })

  it("does not refetch a ticket it has already seen", async () => {
    const { calls, server } = countingServer()
    const { rerender } = renderRung(1, server, null)

    rerender(1)
    await vi.waitFor(() => expect(calls.detail).toEqual([1]))
    rerender(2)
    await vi.waitFor(() => expect(calls.detail).toEqual([1, 2]))

    rerender(1)
    await settle()

    // The whole promise of the entry, as an assertion: re-opening ticket 1 is
    // served from cache inside the stale window, so the server is never asked a
    // second time for it.
    expect(calls.detail).toEqual([1, 2])
  })
})

describe("under StrictMode", () => {
  /**
   * The browser runs this app inside `<StrictMode>` — TanStack Start's default
   * client entry adds it, not our code. In development that double-invokes
   * effects, which makes rung 0 fire its fetch twice. That is StrictMode doing
   * its job (surfacing a non-resilient effect) and does not happen in a
   * production build, so it is deliberately not asserted here.
   *
   * What *is* worth pinning is that it changes nothing for rung 1: the cache
   * still spares the second read. If this ever fails, the entry's central claim
   * has broken somewhere.
   */
  it("rung 1 still serves a repeat selection from cache", async () => {
    const { calls, server } = countingServer()
    const { rerender } = renderRung(1, server, null, true)

    rerender(1)
    await vi.waitFor(() => expect(calls.detail).toEqual([1]))
    rerender(2)
    await vi.waitFor(() => expect(calls.detail).toEqual([1, 2]))

    rerender(1)
    await settle()

    expect(calls.detail).toEqual([1, 2])
  })
})

describe("rung 2 — TanStack DB", () => {
  it("opens a ticket without going to the server at all", async () => {
    const { calls, server } = countingServer()
    const { rerender } = renderRung(2, server, null)
    await expectListSize(2)

    rerender(1)
    await settle()

    // The rows are already local, so a detail view is a query rather than a
    // request. Rung 1 still paid for the *first* open of each ticket; this
    // never does.
    expect(calls.detail).toEqual([])
    expect(calls.list).toBe(1)
  })

  it("shows a write immediately, before the server has been told", async () => {
    const { calls, server } = countingServer()
    const view = captureView()
    renderRung(2, server, null, false, view.capture)
    await expectListSize(2)

    act(() => view.current!.setStatus(1, "done"))

    // No await: the point is that the change is on screen in the same tick, so
    // the assertion runs before any server round-trip could have finished.
    expect(view.current!.list.find((t) => t.id === 1)?.status).toBe("done")

    await settle()
    expect(calls.writes).toBe(1)
  })

  it("undoes the write by itself when the server rejects it", async () => {
    const { server } = countingServer({ failWrites: true })
    const view = captureView()
    renderRung(2, server, null, false, view.capture)
    await expectListSize(2)

    const before = view.current!.list.find((t) => t.id === 1)?.status
    act(() => view.current!.setStatus(1, "done"))
    expect(view.current!.list.find((t) => t.id === 1)?.status).toBe("done")

    // Nothing in our code puts this back — DB drops the optimistic layer when
    // the mutation handler throws. This is the moment the whole rung exists for.
    await vi.waitFor(() =>
      expect(view.current!.list.find((t) => t.id === 1)?.status).toBe(before)
    )
  })
})
