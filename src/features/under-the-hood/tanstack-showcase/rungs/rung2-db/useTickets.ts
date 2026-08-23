import { useCallback } from "react"
import { eq, useLiveQuery } from "@tanstack/react-db"

import type { EventBus } from "../../engine/events"
import type { TicketStatus } from "../../engine/types"
import type { LoadState, TicketsView } from "../contract"
import type { TicketCollection } from "./collection"
import { TICKETS_KEY } from "./collection"
import { useLiveQueryInstrumentation } from "./useLiveQueryInstrumentation"

const TRACE = JSON.stringify(TICKETS_KEY)

/**
 * Rung 2 — the same app again, with a TanStack DB collection over rung 1's Query.
 *
 * Two things change, and they're the two things Query alone can't do.
 *
 * First, there is no detail *fetch*. The rows are already here, so opening a
 * ticket is a local query, not a request — at rung 1 the first open of a ticket
 * still cost a round-trip, and here it never does.
 *
 * Second, writes are optimistic by default. `collection.update(...)` changes the
 * row locally, every live query watching it updates in the same tick, and the
 * server is told afterwards. If the server refuses, DB puts the row back on its
 * own — no snapshots, no list of caches to repair.
 */
export function useDbTickets({
  collection,
  bus,
  selectedId,
}: {
  collection: TicketCollection
  bus: EventBus
  selectedId: number | null
}): TicketsView {
  // A live query, not a fetch: it recomputes locally whenever the rows beneath
  // it change, including from an optimistic write that hasn't reached the
  // server yet.
  const list = useLiveQuery((q) => q.from({ ticket: collection }))

  const detail = useLiveQuery(
    (q) =>
      selectedId === null
        ? undefined
        : q
            .from({ ticket: collection })
            .where(({ ticket }) => eq(ticket.id, selectedId)),
    [selectedId]
  )

  // DB reports its own live-query activity, the same way Query reports its
  // cache. Without this the timeline shows an empty panel for a selection at
  // this rung, which reads as "nothing was recorded" rather than "this cost
  // nothing" — and a live query really did run.
  useLiveQueryInstrumentation(detail.collection, bus, TRACE)

  const listState: LoadState = list.isReady ? "ready" : "loading"
  const detailState: LoadState =
    selectedId === null ? "idle" : detail.isReady ? "ready" : "loading"

  /**
   * Every write is the same shape: change the row, let DB show it immediately,
   * and let it undo the change itself if the server says no. The `catch` is
   * only here to stop an expected rejection surfacing as an unhandled promise —
   * the rollback has already happened by then.
   */
  const write = useCallback(
    (
      label: string,
      apply: () => { isPersisted: { promise: Promise<unknown> } }
    ) => {
      bus.emit("db:optimistic:apply", label, TRACE)
      const tx = apply()
      tx.isPersisted.promise.catch(() => {})
    },
    [bus]
  )

  const create = useCallback(
    (title: string, assignee: string) => {
      bus.emit("ui:interaction", "create ticket")
      write(`insert "${title}"`, () =>
        collection.insert({
          // The server assigns the real id; this one only has to be unique
          // locally for the moment the row is optimistic.
          id: Date.now(),
          title,
          assignee,
          status: "open",
          body: ["Filed from the composer."],
          comments: [],
        })
      )
    },
    [bus, collection, write]
  )

  const setStatus = useCallback(
    (id: number, status: TicketStatus) => {
      bus.emit("ui:interaction", `status → ${status}`)
      write(`update #${id}`, () =>
        collection.update(id, (draft) => {
          draft.status = status
        })
      )
    },
    [bus, collection, write]
  )

  const remove = useCallback(
    async (id: number) => {
      bus.emit("ui:interaction", `delete #${id}`)
      bus.emit("db:optimistic:apply", `delete #${id}`, TRACE)
      // The row leaves the list immediately; this promise is about the server
      // agreeing, which is what the selection waits on.
      await collection.delete(id).isPersisted.promise
    },
    [bus, collection]
  )

  return {
    list: list.data,
    listState,
    detail: detail.data?.[0],
    detailState,
    // A write is never something the UI waits on here, so nothing is ever
    // "mutating" from the user's point of view. That *is* the feature.
    isMutating: false,
    error: null,
    create,
    setStatus,
    remove,
  }
}
