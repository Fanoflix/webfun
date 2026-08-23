import { useMemo } from "react"

import type { EventKind, Flow, NodeId, ShowcaseEvent } from "../engine/types"

/**
 * What a row's Status column says. Mirrors how Chrome reports a cached response
 * as "200 (from disk cache)" rather than inventing a separate concept.
 */
export type RowStatus =
  | { kind: "pending" }
  | { kind: "ok"; code: number }
  | { kind: "failed"; code: number }
  | { kind: "local"; label: string }

/** A local (non-network) event, nested under the request it belongs to. */
export type ChildRow = {
  id: string
  label: string
  detail?: string
  tone: "cache" | "write" | "invalidate" | "error" | "optimistic"
  /**
   * Which part of the system did this, so the row can say whose move it was.
   *
   * Stored as the node, not a label: the panel owns how it's written and
   * coloured. Worth showing at all because the panel deliberately looks like a
   * browser's network tab, where every row is the browser's own work — here
   * half of them are a library's, and which library is the whole subject.
   */
  source: NodeId | null
}

/** Nodes that are a library doing something, as opposed to plain HTTP. */
const TAGGED_NODES: NodeId[] = ["query", "db", "sync"]

const sourceOf = (node: NodeId): NodeId | null =>
  TAGGED_NODES.includes(node) ? node : null

export type TimelineRow = {
  id: string
  /** Set on rows that never touched the network, naming the part responsible. */
  source: NodeId | null
  /** "GET /tickets", or the query key when nothing went to the network. */
  name: string
  status: RowStatus
  /** Formatted duration, or "—" for rows that took no time. */
  time: string
  /** Waterfall geometry as fractions of the flow's span, 0..1. */
  bar: { left: number; width: number } | null
  children: ChildRow[]
}

export type Timeline = {
  title: string
  rows: TimelineRow[]
  duration: string
  isEmpty: boolean
  /**
   * Has anything been done yet?
   *
   * Separate from `isEmpty` because the two mean opposite things. No flow means
   * "you haven't tried anything". A flow with no rows means "you did something
   * and it cost nothing at all" — which, at rung 2, is the entire point and
   * must not be mistaken for the panel failing to record.
   */
  hasFlow: boolean
}

const formatMs = (ms: number) =>
  ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`

/**
 * How each local event reads in a row.
 *
 * Every non-network event kind that should ever appear has to be listed here —
 * anything missing is dropped on the floor, which is exactly how rung 2's
 * whole story went missing the first time.
 */
const CHILD_TONE: Partial<Record<EventKind, ChildRow["tone"]>> = {
  "query:cache:hit": "cache",
  "query:cache:stale": "cache",
  "query:cache:write": "write",
  "query:invalidate": "invalidate",
  "query:error": "error",
  "db:optimistic:apply": "optimistic",
  "db:optimistic:rollback": "error",
  "sync:enqueue": "write",
  "sync:push": "write",
  "sync:ack": "cache",
}

/** A row still waiting for its response. */
type OpenRow = TimelineRow & {
  startedAt: number
  endedAt: number | null
  /** Has the server acknowledged this one yet? Distinguishes a row the client
   *  opened (fetch:start) and is still unclaimed from one already in flight. */
  received: boolean
}

/**
 * Folds a flat event stream into network-tab rows.
 *
 * The shape mirrors Chrome's Network panel because that's the mental model
 * people already have for "what did this actually cost": one row per request,
 * a status, a duration, and a bar showing when it happened relative to
 * everything else. Local events (a cache hit, an invalidation) nest under the
 * request they belong to, so cause and effect stay attached even when two
 * requests overlap.
 *
 * Correlation is by `trace`, never by ordering — with jitter on, responses can
 * land out of order, and an ordering heuristic would quietly mis-attribute them.
 */
export function useTimeline(flow: Flow | null): Timeline {
  return useMemo(() => {
    if (!flow || flow.events.length === 0) {
      return {
        title: flow?.label ?? "Nothing yet",
        rows: [],
        duration: "—",
        isEmpty: true,
        hasFlow: flow !== null,
      }
    }

    const rows: OpenRow[] = []
    /** Requests awaiting a response, oldest first, keyed by trace. */
    const open = new Map<string, OpenRow[]>()
    /**
     * The most recent *network* row per trace, kept after it closes so a cache
     * write that lands after the response still nests under its request rather
     * than under an earlier local row that happens to share the key.
     */
    const lastNetwork = new Map<string, OpenRow>()

    const openFor = (trace: string) => open.get(trace) ?? []
    const pushOpen = (trace: string, row: OpenRow) =>
      open.set(trace, [...openFor(trace), row])
    const shiftOpen = (trace: string) => {
      const queue = openFor(trace)
      const [first, ...rest] = queue
      open.set(trace, rest)
      return first as OpenRow | undefined
    }

    const startRow = (
      event: ShowcaseEvent,
      name: string,
      received: boolean
    ): OpenRow => {
      const row: OpenRow = {
        id: event.id,
        source: null,
        name,
        status: { kind: "pending" },
        time: "—",
        bar: null,
        children: [],
        startedAt: event.at,
        endedAt: null,
        received,
      }
      rows.push(row)
      if (event.trace) {
        pushOpen(event.trace, row)
        lastNetwork.set(event.trace, row)
      }
      return row
    }

    for (const event of flow.events) {
      const trace = event.trace ?? event.detail ?? ""

      switch (event.kind) {
        // The flow's own title already names the interaction, so a row for it
        // would just be noise at the top of every list.
        case "ui:interaction":
          break

        // At rung 1 the client decides to fetch before the server hears about
        // it, so this is where the row begins.
        case "query:fetch:start":
          startRow(event, event.detail ?? "request", false)
          break

        case "server:receive": {
          // Reuse the row the client already opened, unless one is still in
          // flight for this trace — two concurrent identical requests are two
          // rows, which is exactly what makes deduplication visible.
          // Claim the row the client opened for this trace, if one is waiting.
          // If every row for this trace is already in flight, this is a *second*
          // concurrent request and deserves its own row — that duplication is
          // exactly what request deduplication removes at rung 1, so hiding it
          // would erase the thing worth seeing.
          const unclaimed = openFor(trace).find((row) => !row.received)
          const row =
            unclaimed ?? startRow(event, event.detail ?? "request", true)
          row.received = true
          row.name = event.detail ?? row.name
          row.startedAt = Math.min(row.startedAt, event.at)
          break
        }

        case "server:respond":
        case "server:reject": {
          const row = shiftOpen(trace)
          if (!row) break
          row.endedAt = event.at
          row.status =
            event.kind === "server:respond"
              ? { kind: "ok", code: 200 }
              : { kind: "failed", code: 500 }
          row.time = formatMs(event.at - row.startedAt)
          break
        }

        default: {
          const tone = CHILD_TONE[event.kind]
          if (!tone) break
          const parent = openFor(trace).at(-1) ?? lastNetwork.get(trace)
          const child: ChildRow = {
            id: event.id,
            label: event.label,
            detail: event.detail,
            tone,
            source: sourceOf(event.node),
          }
          if (parent) {
            parent.children.push(child)
            break
          }
          // Nothing went to the network for this — a pure cache read. It gets a
          // row of its own, with a pseudo-status instead of a code.
          rows.push({
            id: event.id,
            source: sourceOf(event.node),
            name: event.detail ?? event.label,
            status: { kind: "local", label: localLabel(event.kind) },
            time: "0ms",
            bar: null,
            children: [],
            startedAt: event.at,
            endedAt: event.at,
            received: true,
          })
        }
      }
    }

    const span = Math.max(1, flow.events.at(-1)?.at ?? 1)
    for (const row of rows) {
      if (row.endedAt === null || row.endedAt === row.startedAt) continue
      row.bar = {
        left: row.startedAt / span,
        width: (row.endedAt - row.startedAt) / span,
      }
    }

    return {
      title: flow.label,
      rows,
      duration: formatMs(span),
      isEmpty: rows.length === 0,
      hasFlow: true,
    }
  }, [flow])
}

/** The pseudo-status a row gets when nothing went to the network for it. */
function localLabel(kind: EventKind): string {
  if (kind === "query:cache:hit") return "from cache"
  if (kind === "query:cache:stale") return "cache · stale"
  if (kind === "query:invalidate") return "invalidated"
  if (kind === "db:optimistic:apply") return "optimistic"
  if (kind === "db:optimistic:rollback") return "rolled back"
  if (kind === "sync:enqueue" || kind === "sync:push") return "queued"
  if (kind === "sync:ack") return "acked"
  return "local"
}
