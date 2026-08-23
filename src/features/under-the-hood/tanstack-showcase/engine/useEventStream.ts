import { useSyncExternalStore } from "react"

import type { EventBus } from "./events"
import type { Flow } from "./types"

/**
 * Subscribes React to the event bus.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: the bus already
 * *is* an external store with a subscribe function and an immutable snapshot, so
 * this is the primitive built for the job — no mirror copy of the flow in React
 * state, and nothing to keep in sync.
 */
export function useEventStream(bus: EventBus): Flow | null {
  return useSyncExternalStore(bus.subscribe, bus.getFlow, bus.getFlow)
}
