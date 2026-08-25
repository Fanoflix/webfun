import { useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { EventBus } from "../../engine/events"
import type { Server } from "../../engine/server"
import type { TicketStatus } from "../../engine/types"
import type { LoadState, TicketsView } from "../contract"

/**
 * How long an answer counts as fresh. Deliberately long: within this window
 * re-selecting a ticket paints with no request at all, which is the thing the
 * timeline is there to show.
 */
export const STALE_TIME = 30_000

/** One place that knows how ticket queries are keyed. */
const ticketKeys = {
  all: ["tickets"] as const,
  list: () => ["tickets", "list"] as const,
  detail: (id: number) => ["tickets", "detail", id] as const,
}

/**
 * The string form of a key, used as the correlation id on events. Matches what
 * the cache subscription reports, so a request and the cache write that follows
 * it line up in the timeline.
 */
const traceOf = (key: readonly unknown[]) => JSON.stringify(key)

/**
 * Where the detail observer parks when nothing is selected.
 *
 * `enabled` stops it fetching, but the observer still registers a query under
 * whatever key it was given — so a placeholder like `detail(-1)` would sit in
 * the cache under the `tickets` prefix and turn up in every invalidation
 * cascade. Parking it outside that prefix keeps the cache honest: there is no
 * ticket query when there is no ticket.
 */
const IDLE_DETAIL_KEY = ["no-ticket-selected"] as const

const toLoadState = (
  status: "pending" | "error" | "success",
  enabled = true
): LoadState => {
  if (!enabled) return "idle"
  if (status === "pending") return "loading"
  return status === "error" ? "error" : "ready"
}

/**
 * Rung 1 — the same app, with TanStack Query underneath.
 *
 * Every effect from rung 0 is gone. Fetching is declared rather than started:
 * you say what a piece of data *is* and Query decides whether it needs asking
 * for. Re-selecting a ticket inside the stale window costs nothing. And the
 * And the hand-written refetch-after-write bookkeeping becomes a matter of
 * naming the *data* a write changed, rather than tracking down every view that
 * happens to be showing it.
 */
export function useQueryTickets({
  server,
  bus,
  selectedId,
}: {
  server: Server
  bus: EventBus
  selectedId: number | null
}): TicketsView {
  const queryClient = useQueryClient()

  // @beat query:cache:hit
  const listQuery = useQuery({
    queryKey: ticketKeys.list(),
    queryFn: ({ signal }) =>
      server.listTickets(traceOf(ticketKeys.list()), signal),
    staleTime: STALE_TIME,
  })

  // Declared unconditionally even when nothing is selected — `enabled` is what
  // turns it off, so the hook order never changes.
  const detailQuery = useQuery({
    queryKey:
      selectedId === null ? IDLE_DETAIL_KEY : ticketKeys.detail(selectedId),
    // Query supplies the signal; forwarding it is all that's needed for a
    // superseded request to be called off.
    queryFn: ({ signal }) =>
      server.getTicket(
        selectedId!,
        traceOf(ticketKeys.detail(selectedId!)),
        signal
      ),
    enabled: selectedId !== null,
    staleTime: STALE_TIME,
  })

  /**
   * Everything a write touches, and nothing else.
   *
   * Every mutation names the keys it actually changed. That's still a long way
   * from rung 0, where you had to know every *view* the data appeared in — here
   * you name the data and Query works out who was watching it. But it stops
   * short of invalidating the whole `tickets` prefix, which would mark every
   * other ticket's detail stale because one of them changed.
   */
  // @beat query:invalidate
  const invalidateList = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ticketKeys.list() }),
    [queryClient]
  )

  const invalidateTicket = useCallback(
    (id: number) =>
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) }),
    [queryClient]
  )

  const createMutation = useMutation({
    mutationFn: ({ title, assignee }: { title: string; assignee: string }) =>
      server.createTicket(title, assignee),
    // A new ticket changes the list. No existing ticket's detail is affected.
    onSuccess: invalidateList,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TicketStatus }) =>
      server.setStatus(id, status),
    // The list shows the status, and so does this one ticket. Nothing else.
    onSuccess: (_result, { id }) => {
      void invalidateList()
      void invalidateTicket(id)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => server.deleteTicket(id),
    onSuccess: (_result, id) => {
      void invalidateList()
      // Removed, not invalidated: invalidating would ask Query to keep and
      // refresh a cache entry for a ticket that no longer exists.
      queryClient.removeQueries({ queryKey: ticketKeys.detail(id) })
    },
  })

  const create = useCallback(
    (title: string, assignee: string) => {
      bus.emit("ui:interaction", "create ticket")
      createMutation.mutate({ title, assignee })
    },
    [bus, createMutation]
  )

  const setStatus = useCallback(
    (id: number, status: TicketStatus) => {
      bus.emit("ui:interaction", `status → ${status}`)
      statusMutation.mutate({ id, status })
    },
    [bus, statusMutation]
  )

  const remove = useCallback(
    async (id: number) => {
      bus.emit("ui:interaction", `delete #${id}`)
      await removeMutation.mutateAsync(id)
    },
    [bus, removeMutation]
  )

  const writeError =
    createMutation.error ?? statusMutation.error ?? removeMutation.error

  return {
    list: listQuery.data ?? [],
    listState: toLoadState(listQuery.status),
    detail: detailQuery.data,
    detailState: toLoadState(detailQuery.status, selectedId !== null),
    isMutating:
      createMutation.isPending ||
      statusMutation.isPending ||
      removeMutation.isPending,
    error: writeError instanceof Error ? writeError.message : null,
    create,
    setStatus,
    remove,
  }
}
