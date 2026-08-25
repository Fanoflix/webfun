import { Globe, RefreshCw, X, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { EventKind } from "../engine/types"

/**
 * What's travelling down the wire.
 *
 * Four markers, deliberately. A vocabulary you have to learn is worse than no
 * vocabulary, and the only distinction the entry actually argues about is
 * *did this cost a trip to the server or not* — everything else is detail the
 * network panel already carries in words.
 *
 * No arrows. The packet is already moving in a direction, and an arrow drawn
 * the other way reads as a contradiction rather than a label.
 *
 * One icon keeps one colour, so the pairing is learnable after a couple of
 * flows. Green is reserved for the moments the entry argues *for*.
 */
export type Marker = {
  icon: LucideIcon
  color: string
  /** Plain-English meaning, one hover away. */
  meaning: string
  /**
   * Does this actually cross the gap?
   *
   * A free read never went anywhere — it was answered where it stood. Animating
   * it along the line implies a journey that didn't happen, and at a glance it
   * looks the same as a request. Those markers sit still beside the line instead
   * and simply fade, which is a truer picture of "nothing moved".
   */
  travels: boolean
}

const GREEN = "#4caf7d"
const ORANGE = "#f5a623"
const AMBER = "#d9a441"
const RED = "#e5534b"

/** Nothing left the browser. */
const FREE: Marker = {
  icon: Zap,
  color: GREEN,
  meaning: "answered on the spot — nothing left the browser",
  travels: false,
}

/** A real trip to the server, in either direction. */
const NETWORK: Marker = {
  travels: true,
  icon: Globe,
  color: ORANGE,
  meaning: "over the network",
}

/** Shown now, checked behind your back. */
const REFRESH: Marker = {
  travels: true,
  icon: RefreshCw,
  color: AMBER,
  meaning: "shown now, refreshed behind your back",
}

/** Refused, or undone because it was refused. */
const FAILED: Marker = {
  travels: true,
  icon: X,
  color: RED,
  meaning: "refused — and anything optimistic was put back",
}

const BY_KIND: Partial<Record<EventKind, Marker>> = {
  // Free: local, instant, nothing over the wire.
  "ui:interaction": FREE,
  "query:cache:hit": FREE,
  "query:cache:write": FREE,
  "db:live:read": FREE,
  "db:optimistic:apply": FREE,

  // Network: something crossed the wire, whichever way it was going.
  "query:fetch:start": NETWORK,
  "server:receive": NETWORK,
  "server:respond": NETWORK,
  "sync:enqueue": NETWORK,
  "sync:push": NETWORK,
  "sync:ack": NETWORK,

  // Refresh: usable now, being checked anyway.
  "query:cache:stale": REFRESH,
  "query:invalidate": REFRESH,
  "query:cache:remove": FREE,

  // Failed.
  "server:reject": FAILED,
  "server:cancelled": FAILED,
  "query:error": FAILED,
  "db:optimistic:rollback": FAILED,
}

/** Anything unmapped travels as a network packet rather than vanishing. */
export const markerFor = (kind: EventKind): Marker => BY_KIND[kind] ?? NETWORK
