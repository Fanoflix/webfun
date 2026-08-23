/**
 * Shared vocabulary for the showcase.
 *
 * The whole entry is built on one idea: every interesting moment in a data layer
 * emits a typed event, and several surfaces render that same stream. So the
 * event type is the load-bearing type here — the app UI, the timeline, and (in
 * later phases) the architecture diagram and code panel are all just different
 * renderings of `ShowcaseEvent`.
 */

export type TicketStatus = "open" | "in-progress" | "done"

export type Ticket = {
  id: number
  title: string
  status: TicketStatus
  assignee: string
  /** One-line description, so the detail pane has something real to show. */
  body: string
}

/**
 * A box in the architecture diagram. Events carry the node they happened *at*,
 * which is what lets the same stream drive a diagram in a later phase without
 * re-deriving anything.
 */
export type NodeId = "ui" | "query" | "db" | "sync" | "server"

/**
 * Every moment worth showing. The `db:` and `sync:` kinds are declared now but
 * only emitted from rung 2 onwards (phase 3) — declaring the full vocabulary up
 * front keeps the renderers exhaustive from the start.
 */
export type EventKind =
  | "ui:interaction"
  | "query:fetch:start"
  | "query:cache:hit"
  | "query:cache:stale"
  | "query:cache:write"
  | "query:invalidate"
  | "query:error"
  | "db:optimistic:apply"
  | "db:optimistic:rollback"
  | "sync:enqueue"
  | "sync:push"
  | "sync:ack"
  | "server:receive"
  | "server:respond"
  | "server:reject"

export type ShowcaseEvent = {
  id: string
  kind: EventKind
  node: NodeId
  /** Short human label, e.g. "cache hit — no request". */
  label: string
  /** Optional specific: the query key, the ticket title. */
  detail?: string
  /** Milliseconds since the flow began, so the timeline can show the shape. */
  at: number
  /**
   * What this event is *about* — a query key, or the endpoint being called.
   *
   * This is the correlation id that lets the timeline nest a cache write under
   * the request that produced it. Without it the timeline is a flat log and you
   * have to infer cause and effect from ordering, which stops being reliable the
   * moment two requests overlap.
   */
  trace?: string
}

/**
 * One user interaction and everything it caused.
 *
 * A flow opens when someone clicks something and stays current until the next
 * interaction opens a new one. That's the whole lifecycle — the timeline's
 * "reset and repopulate" behaviour falls out of it, with no quiescence timer to
 * tune and no way for two flows to interleave.
 */
export type Flow = {
  id: string
  label: string
  startedAt: number
  events: ShowcaseEvent[]
}
