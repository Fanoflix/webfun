import { useMemo } from "react"

import type { RungId } from "../engine/rungs"
import type {
  EventKind,
  Flow,
  FlowKind,
  NodeId,
  ShowcaseEvent,
} from "../engine/types"
import { explainEvent } from "./explanations"

/**
 * What a row's Status column says. Mirrors how Chrome reports a cached response
 * as "200 (from disk cache)" rather than inventing a separate concept.
 */
export type RowStatus =
  | { kind: "pending" }
  | { kind: "cancelled" }
  | { kind: "ok"; code: number }
  | { kind: "failed"; code: number }
  | { kind: "local"; label: string }

/** A local (non-network) event, nested under the request it belongs to. */
export type ChildRow = {
  id: string
  label: string
  detail?: string
  /** Why this beats the rung below, or names the flaw at rung 0. */
  hint: string | null
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
  /** Why this beats the rung below, or names the flaw at rung 0. */
  hint: string | null
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

/** One interaction and everything it caused, as a labelled group of rows. */
export type TimelineSegment = {
  id: string
  label: string
  /** Whether the person caused this, or the app did it to itself. */
  kind: FlowKind
  rows: TimelineRow[]
  duration: string
}

export type Timeline = {
  segments: TimelineSegment[]
  /** How many rows actually went to the network, across the whole log. */
  requestCount: number
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
  "query:cache:remove": "invalidate",
  "query:error": "error",
  "db:live:read": "cache",
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
/**
 * How many rows the log shows at once.
 *
 * Trimmed here rather than in the event bus: a single row is assembled from
 * several events (a request and its response at minimum), so capping raw events
 * would tear rows in half. By this point the pairing is done and a row is a
 * whole thing that can be dropped safely.
 */
export const MAX_LOGGING_ROWS = 20

export function useTimeline(flows: Flow[], rung: RungId): Timeline {
  return useMemo(() => {
    const segments = trimToLastRows(
      buildSegments(flows, rung).filter((segment) => segment.rows.length > 0),
      MAX_LOGGING_ROWS
    )

    return {
      segments,
      requestCount: segments.reduce(
        (total, segment) =>
          total +
          segment.rows.filter((row) => row.status.kind !== "local").length,
        0
      ),
      isEmpty: segments.length === 0,
      hasFlow: flows.length > 0,
    }
  }, [flows, rung])
}

/**
 * Keeps only the newest `limit` rows, dropping whole segments once they've been
 * emptied. Oldest-first, so the log behaves like a tail: one falls off the top
 * as one arrives at the bottom.
 */
function trimToLastRows(
  segments: TimelineSegment[],
  limit: number
): TimelineSegment[] {
  const total = segments.reduce((n, segment) => n + segment.rows.length, 0)
  if (total <= limit) return segments

  let toDrop = total - limit
  const kept: TimelineSegment[] = []

  for (const segment of segments) {
    if (toDrop === 0) {
      kept.push(segment)
      continue
    }
    if (toDrop >= segment.rows.length) {
      toDrop -= segment.rows.length
      continue
    }
    kept.push({ ...segment, rows: segment.rows.slice(toDrop) })
    toDrop = 0
  }

  return kept
}

/**
 * Folds every interaction's events into labelled groups of rows — in one pass,
 * on purpose.
 *
 * Each group is built in isolation and a response could only close a row from
 * the same group. But a response arrives whenever it arrives: click a second
 * ticket while the first is still loading and its reply lands in the *next*
 * group, leaving the row that asked for it stuck on "pending" forever while the
 * reply itself was discarded. Sharing the open-request map across groups is what
 * lets a row be closed by a response that shows up after you'd moved on.
 *
 * Times are absolute here for the same reason. An event's `at` is relative to
 * its own flow, so a request and a response from different flows are measured
 * from different origins — subtracting them would produce nonsense.
 */
function buildSegments(flows: Flow[], rung: RungId): TimelineSegment[] {
  const segments: TimelineSegment[] = []

  /** Requests still waiting for a reply, oldest first, keyed by trace. */
  const open = new Map<string, OpenRow[]>()
  /** The most recent network row per trace, so late children still find it. */
  const lastNetwork = new Map<string, OpenRow>()

  const openFor = (trace: string) => open.get(trace) ?? []
  const pushOpen = (trace: string, row: OpenRow) =>
    open.set(trace, [...openFor(trace), row])
  const shiftOpen = (trace: string) => {
    const [first, ...rest] = openFor(trace)
    open.set(trace, rest)
    return first as OpenRow | undefined
  }

  for (const flow of flows) {
    const rows: OpenRow[] = []

    const startRow = (
      event: ShowcaseEvent,
      at: number,
      name: string,
      received: boolean
    ): OpenRow => {
      const row: OpenRow = {
        id: event.id,
        hint: explainEvent(null, rung),
        source: null,
        name,
        status: { kind: "pending" },
        time: "—",
        bar: null,
        children: [],
        startedAt: at,
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
      // Absolute, so rows spanning two flows still measure correctly.
      const at = flow.startedAt + event.at

      switch (event.kind) {
        // The flow's own title already names the interaction.
        case "ui:interaction":
          break

        case "query:fetch:start":
          startRow(event, at, event.detail ?? "request", false)
          break

        case "server:receive": {
          const unclaimed = openFor(trace).find((row) => !row.received)
          const row =
            unclaimed ?? startRow(event, at, event.detail ?? "request", true)
          row.received = true
          row.name = event.detail ?? row.name
          row.startedAt = Math.min(row.startedAt, at)
          break
        }

        case "server:respond":
        case "server:reject":
        case "server:cancelled": {
          const row = shiftOpen(trace)
          if (!row) break
          row.endedAt = at
          row.status =
            event.kind === "server:respond"
              ? { kind: "ok", code: 200 }
              : event.kind === "server:cancelled"
                ? { kind: "cancelled" }
                : { kind: "failed", code: 500 }
          row.time =
            event.kind === "server:cancelled"
              ? "—"
              : formatMs(at - row.startedAt)
          break
        }

        default: {
          const tone = CHILD_TONE[event.kind]
          if (!tone) break
          const parent = openFor(trace).at(-1) ?? lastNetwork.get(trace)
          const child: ChildRow = {
            id: event.id,
            hint: explainEvent(event.kind, rung),
            label: event.label,
            detail: event.detail,
            tone,
            source: sourceOf(event.node),
          }
          if (parent) {
            parent.children.push(child)
            break
          }
          rows.push({
            id: event.id,
            hint: explainEvent(event.kind, rung),
            source: sourceOf(event.node),
            name: event.detail ?? event.label,
            status: { kind: "local", label: localLabel(event.kind) },
            time: "0ms",
            bar: null,
            children: [],
            startedAt: at,
            endedAt: at,
            received: true,
          })
        }
      }
    }

    // Geometry is measured within the group, so a quick interaction beside a
    // slow one still shows its own shape. A row that outlives its group is
    // clamped rather than drawn off the end.
    const last = flow.events.at(-1)
    const span = Math.max(1, last ? last.at : 1)
    const clamp = (n: number) => Math.min(Math.max(n, 0), 1)

    for (const row of rows) {
      if (row.endedAt === null || row.endedAt === row.startedAt) continue
      const left = clamp((row.startedAt - flow.startedAt) / span)
      row.bar = {
        left,
        width: clamp((row.endedAt - row.startedAt) / span - 0) || 0.02,
      }
    }

    segments.push({
      id: flow.id,
      label: flow.label,
      kind: flow.kind,
      rows,
      duration: formatMs(span),
    })
  }

  return segments
}

/** The pseudo-status a row gets when nothing went to the network for it. */
function localLabel(kind: EventKind): string {
  if (kind === "query:cache:hit") return "from cache"
  if (kind === "query:cache:stale") return "cache · stale"
  if (kind === "query:invalidate") return "invalidated"
  if (kind === "query:cache:remove") return "removed"
  if (kind === "db:live:read") return "live query"
  if (kind === "db:optimistic:apply") return "optimistic"
  if (kind === "db:optimistic:rollback") return "rolled back"
  if (kind === "sync:enqueue" || kind === "sync:push") return "queued"
  if (kind === "sync:ack") return "acked"
  return "local"
}
