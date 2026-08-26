import type { Ticket, TicketStatus, TicketSummary } from "../engine/types"

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
  /** Summaries — the list endpoint never sends a body. */
  list: TicketSummary[]
  listState: LoadState
  /**
   * The selected row's header, if the rung can produce one without asking.
   *
   * `undefined` at rung 0, which has nowhere to read it from but its own local
   * state — so the pane waits for the whole ticket and shows a skeleton. From
   * rung 1 up it comes out of the cache, so the title, status and assignee are
   * on screen the moment you click and only the body is in flight. At rung 2 it
   * is a live row on top of that: an optimistic status change lands here in the
   * same tick, where rung 1 waits for the refetch its invalidation triggered.
   *
   * That progression — nothing, then cached, then live — is the read half of
   * the ladder, and it is why this is on the contract rather than derived in
   * the view from `list`.
   */
  summary: TicketSummary | undefined
  /** The full ticket, once a detail request has landed. */
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
