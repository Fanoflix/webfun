import { useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { EventBus } from "../../engine/events"
import type { Server } from "../../engine/server"
import type { TicketStatus } from "../../engine/types"
import type { LoadState, TicketsView } from "../contract"
import { IDLE_DETAIL_KEY, STALE_TIME, ticketKeys, traceOf } from "./keys"

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

  const list = listQuery.data ?? []

  return {
    list,
    listState: toLoadState(listQuery.status),
    // Straight off the list that's already loaded. Nothing clever — but it's
    // what lets the pane draw a header while the body is still in flight.
    summary: list.find((ticket) => ticket.id === selectedId),
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
