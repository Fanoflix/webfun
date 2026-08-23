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
 * hand-written refetch-after-write bookkeeping collapses into one
 * `invalidateQueries` call that no future view can be forgotten from.
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
    queryFn: () => server.listTickets(),
    staleTime: STALE_TIME,
  })

  // Declared unconditionally even when nothing is selected — `enabled` is what
  // turns it off, so the hook order never changes.
  const detailQuery = useQuery({
    queryKey: ticketKeys.detail(selectedId ?? -1),
    queryFn: () => server.getTicket(selectedId!),
    enabled: selectedId !== null,
    staleTime: STALE_TIME,
  })

  /**
   * One line replacing rung 0's manual refetching. It also covers views that
   * don't exist yet: anything keyed under `tickets` is caught by this, so adding
   * a new list later can't silently leave it stale.
   */
  // @beat query:invalidate
  const invalidateTickets = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
    [queryClient]
  )

  const createMutation = useMutation({
    mutationFn: ({ title, assignee }: { title: string; assignee: string }) =>
      server.createTicket(title, assignee),
    onSuccess: invalidateTickets,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TicketStatus }) =>
      server.setStatus(id, status),
    onSuccess: invalidateTickets,
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => server.deleteTicket(id),
    onSuccess: invalidateTickets,
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
    (id: number) => {
      bus.emit("ui:interaction", `delete #${id}`)
      removeMutation.mutate(id)
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
