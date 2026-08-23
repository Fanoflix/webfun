import type { Ticket, TicketStatus } from "../engine/types"

/** Loading state, reduced to the three cases the UI actually branches on. */
export type LoadState = "idle" | "loading" | "ready" | "error"

/**
 * The single interface every rung implements.
 *
 * This is what lets the app be written once. It's deliberately the *naive*
 * shape — a list, a detail, some flags — because forcing rung 0 to express
 * itself in Query's vocabulary would flatter it, and forcing rung 1 into
 * something exotic would flatter Query. Everything interesting happens in how
 * each rung fills this in, not in the shape itself.
 */
export type TicketsView = {
  list: Ticket[]
  listState: LoadState
  detail: Ticket | undefined
  detailState: LoadState
  isMutating: boolean
  /** Last write error, surfaced so the fail-writes switch is visible in the UI. */
  error: string | null
  create: (title: string, assignee: string) => void
  setStatus: (id: number, status: TicketStatus) => void
  /**
   * Resolves once the server has accepted the delete, rejects if it refuses.
   *
   * Awaitable where the others aren't because the caller has a decision to make
   * on the outcome: the selection may only move off a row once that row is
   * really gone, or a rejected delete leaves you looking at the wrong ticket.
   */
  remove: (id: number) => Promise<void>
}
