import type { EventKind, Flow, NodeId, ShowcaseEvent } from "./types"

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
  "query:error": { node: "query", label: "request failed" },
  "db:optimistic:apply": { node: "db", label: "optimistic write applied" },
  "db:optimistic:rollback": { node: "db", label: "rolled back" },
  "sync:enqueue": { node: "sync", label: "queued for sync" },
  "sync:push": { node: "sync", label: "pushed to server" },
  "sync:ack": { node: "sync", label: "server acknowledged" },
  "server:receive": { node: "server", label: "request received" },
  "server:respond": { node: "server", label: "responded" },
  "server:reject": { node: "server", label: "rejected the write" },
}

export type EventBus = {
  /** Open a new flow. Whatever the previous flow collected is replaced. */
  beginFlow: (label: string) => void
  emit: (kind: EventKind, detail?: string, trace?: string) => void
  subscribe: (listener: () => void) => () => void
  /** Stable snapshot — safe as a `useSyncExternalStore` getSnapshot. */
  getFlow: () => Flow | null
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
  let flow: Flow | null = null
  const listeners = new Set<() => void>()

  const notify = () => listeners.forEach((l) => l())

  return {
    beginFlow(label) {
      flow = { id: uid("flow"), label, startedAt: now(), events: [] }
      notify()
    },

    emit(kind, detail, trace) {
      // An event with no flow to belong to is dropped rather than opening one
      // implicitly: background noise would otherwise land at the head of the
      // timeline and read as though the user had caused it.
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
      flow = { ...flow, events: [...flow.events, event] }
      notify()
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getFlow: () => flow,
  }
}
