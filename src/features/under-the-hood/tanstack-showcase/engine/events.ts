import type { EventKind, Flow, FlowKind, NodeId, ShowcaseEvent } from "./types"

/**
 * Where each kind of event happens, and how to say it in English.
 *
 * Centralised so the wording is consistent everywhere it surfaces — a hint
 * bubble, a timeline row and (later) a diagram node all read the same phrase
 * rather than three hand-written variants that drift apart.
 */
const EVENT_META: Record<EventKind, { node: NodeId; label: string }> = {
  "ui:interaction": { node: "ui", label: "interaction" },
  "query:fetch:start": { node: "query", label: "fetching from server" },
  "query:cache:hit": { node: "query", label: "cache hit — no request" },
  "query:cache:stale": {
    node: "query",
    label: "cache hit — stale, revalidating",
  },
  "query:cache:write": { node: "query", label: "response written to cache" },
  "query:invalidate": { node: "query", label: "queries invalidated" },
  "query:cache:remove": { node: "query", label: "dropped from cache" },
  "query:error": { node: "query", label: "request failed" },
  "db:live:read": { node: "db", label: "live query ran — no request" },
  "db:optimistic:apply": { node: "db", label: "optimistic write applied" },
  "db:optimistic:rollback": { node: "db", label: "rolled back" },
  "sync:enqueue": { node: "sync", label: "queued for sync" },
  "sync:push": { node: "sync", label: "pushed to server" },
  "sync:ack": { node: "sync", label: "server acknowledged" },
  "server:receive": { node: "server", label: "request received" },
  "server:respond": { node: "server", label: "responded" },
  "server:cancelled": {
    node: "server",
    label: "cancelled — nobody is waiting",
  },
  "server:reject": { node: "server", label: "rejected the write" },
}

export type EventBus = {
  /**
   * Start a new segment. Previous segments are *kept* — the log accumulates the
   * way a network tab does with "preserve log" on, so you can compare what two
   * clicks cost without having to remember the first one.
   */
  beginFlow: (label: string, kind?: FlowKind) => void
  emit: (kind: EventKind, detail?: string, trace?: string) => void
  /** Throw the whole log away. The rung switch and the clear button do this. */
  clear: () => void
  subscribe: (listener: () => void) => () => void
  /** Stable snapshot — safe as a `useSyncExternalStore` getSnapshot. */
  getFlows: () => Flow[]
}

let nextId = 0
/**
 * Monotonic counter rather than `crypto.randomUUID`: ids stay deterministic in
 * tests, and nothing here needs to be unguessable.
 */
const uid = (prefix: string) => `${prefix}-${++nextId}`

export function createEventBus(now: () => number = () => Date.now()): EventBus {
  // Replaced wholesale on every change, never mutated, so a referential
  // equality check in `useSyncExternalStore` is enough to detect updates.
  let flows: Flow[] = []
  const listeners = new Set<() => void>()

  const notify = () => listeners.forEach((l) => l())

  return {
    beginFlow(label, kind = "interaction") {
      flows = [
        ...flows,
        { id: uid("flow"), label, kind, startedAt: now(), events: [] },
      ]
      notify()
    },

    clear() {
      flows = []
      notify()
    },

    emit(kind, detail, trace) {
      // An event with no segment to belong to is dropped rather than opening one
      // implicitly: background noise would otherwise land at the head of the log
      // and read as though the user had caused it.
      const flow = flows.at(-1)
      if (!flow) return
      const meta = EVENT_META[kind]
      const event: ShowcaseEvent = {
        id: uid("evt"),
        kind,
        node: meta.node,
        label: meta.label,
        detail,
        trace,
        at: now() - flow.startedAt,
      }
      flows = [
        ...flows.slice(0, -1),
        { ...flow, events: [...flow.events, event] },
      ]
      notify()
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getFlows: () => flows,
  }
}
