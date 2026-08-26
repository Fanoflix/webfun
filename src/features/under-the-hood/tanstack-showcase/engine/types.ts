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

/**
 * A comment on a ticket. Read-only in this demo — there's no compose box, and
 * nothing here writes one. They exist so the detail pane has the shape of a
 * real issue tracker rather than a title and one line.
 *
 * `at` is a fixed human string rather than a timestamp: nothing sorts or
 * recomputes it, and a real clock would only add drift for no visible gain.
 */
export type Comment = {
  id: string
  author: string
  body: string
  at: string
}

/**
 * What a list endpoint sends: enough to draw a row, and nothing more.
 *
 * The split is the point. A real `GET /tickets` does not ship every comment on
 * every ticket — it sends a page of summaries with an excerpt, and the body
 * arrives only when you open something. Without that split the detail request
 * in this demo would be pure theatre: the list would already hold the answer,
 * and a viewer reading the network panel would rightly ask why we asked twice.
 */
export type TicketSummary = {
  id: number
  title: string
  status: TicketStatus
  assignee: string
  /**
   * The first line of the body, as the server would cut it — the second line of
   * each inbox row. Sent by the list because every list needs *something* past
   * the title, and computed server-side so no client has to hold a body to
   * render a preview.
   */
  preview: string
}

/**
 * What a detail endpoint sends: the summary, plus everything the list left out.
 *
 * An intersection rather than a separate shape, so anything that only needs the
 * header — the title bar, a row, the status dropdown — accepts a summary and a
 * full ticket interchangeably. That is what lets the detail pane paint its
 * header from the list row while the body is still in flight.
 */
export type Ticket = TicketSummary & {
  /**
   * The description, as separate lines.
   *
   * An array rather than one string so the detail pane can lay it out as real
   * paragraphs.
   */
  body: string[]
  comments: Comment[]
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
  | "query:cache:remove"
  | "query:error"
  | "db:live:read"
  | "db:optimistic:apply"
  | "db:optimistic:rollback"
  | "sync:enqueue"
  | "sync:push"
  | "sync:ack"
  | "server:receive"
  | "server:respond"
  | "server:cancelled"
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
/**
 * Who started a segment.
 *
 * `interaction` is something the person did; `system` is the app loading itself
 * — a first mount, or the cold start after switching rung. Worth distinguishing
 * because the log is trying to answer "what did *my click* cost", and a boot
 * sequence billed to the reader would muddle that.
 */
export type FlowKind = "interaction" | "system"

export type Flow = {
  id: string
  label: string
  kind: FlowKind
  startedAt: number
  events: ShowcaseEvent[]
}
