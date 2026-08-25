import { useMemo } from "react"

import type { RungId } from "../engine/rungs"
import type { EventKind, Flow, NodeId, ShowcaseEvent } from "../engine/types"
import { RUNG_NODES } from "./nodes"
import type { ArchNode } from "./nodes"

/**
 * Events that represent something coming *back* to the person, rather than a
 * question travelling further from them.
 *
 * Direction has to follow what an event *is*, not merely where it happened. A
 * cache hit happens at Query, but it isn't a question arriving there — it's the
 * answer arriving at the interface, and drawing it downward put a marker that
 * means "here's your answer, free" on the path a question takes.
 */
const INBOUND: ReadonlySet<EventKind> = new Set<EventKind>([
  "query:cache:hit",
  "query:cache:stale",
  "query:cache:write",
  "query:error",
  "db:live:read",
  "db:optimistic:rollback",
  "sync:ack",
  "server:reject",
  "server:cancelled",
])

/** A packet crossing one edge, replayed whenever `id` changes. */
export type EdgeTraffic = {
  /** The event that caused it — changing this is what replays the animation. */
  id: string
  /** Towards the server, or coming back. */
  direction: "out" | "in"
  /**
   * Down and back in one motion.
   *
   * Set on the *request*, because that's the only moment early enough to make
   * the return land with the data. `server:respond` fires when the response has
   * already arrived, so a packet started there is always chasing something that
   * has finished — which is exactly what it looked like.
   */
  roundTrip?: boolean
  /** What's travelling, so the view can pick its shape and colour. */
  kind: EventKind
} | null

export type ArchNodeView = ArchNode & {
  /** The last thing that happened here, in words. Empty until something does. */
  last: string | null
  /** The event id, so the view can pulse once per new arrival. */
  pulseKey: string | null
}

export type Architecture = {
  nodes: ArchNodeView[]
  /** One entry per gap between nodes; `edges[i]` sits between node i and i+1. */
  edges: EdgeTraffic[]
  requestCount: number
}

/**
 * Turns the same event stream the network panel reads into a diagram.
 *
 * Nothing here is a separate source of truth: an event knows which node it
 * happened at, so lighting the right box is a lookup, and the edge that lights
 * is simply the one arriving at that box. Responses travel back down the edge
 * they came in on, which is what makes a round-trip look like a round-trip.
 */
export function useArchitecture(flows: Flow[], rung: RungId): Architecture {
  return useMemo(() => {
    const layout = RUNG_NODES[rung]
    const indexOf = new Map(layout.map((node, i) => [node.id, i]))

    const last: Partial<Record<NodeId, ShowcaseEvent>> = {}
    const edges: EdgeTraffic[] = layout.slice(1).map(() => null)
    let requestCount = 0

    for (const flow of flows) {
      for (const event of flow.events) {
        const index = indexOf.get(event.node)
        // Events at a node this rung doesn't have (Query's chatter at rung 2,
        // which sits behind the collection) simply have nowhere to land.
        if (index === undefined) continue

        last[event.node] = event

        // The edge *into* this node. The first node has nothing to its left.
        const edge = index - 1
        if (edge < 0) continue

        if (event.kind === "server:receive") {
          requestCount += 1
          edges[edge] = {
            id: event.id,
            direction: "out",
            kind: event.kind,
            roundTrip: true,
          }
        } else if (event.kind === "server:respond") {
          // Deliberately draws nothing. The request's round trip already showed
          // the journey home, and timed it to finish as the data appears.
        } else {
          // A refusal arrives late, but bad news is about *what* happened
          // rather than exactly when, so it still gets its own marker.
          edges[edge] = {
            id: event.id,
            direction: INBOUND.has(event.kind) ? "in" : "out",
            kind: event.kind,
          }
        }
      }
    }

    return {
      nodes: layout.map((node) => ({
        ...node,
        last: last[node.id]?.label ?? null,
        pulseKey: last[node.id]?.id ?? null,
      })),
      edges,
      requestCount,
    }
  }, [flows, rung])
}
