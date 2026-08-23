import { useEffect } from "react"
import type { Collection } from "@tanstack/react-db"

import type { EventBus } from "../../engine/events"

/**
 * Reports when a live query re-runs, using TanStack DB's own change stream.
 *
 * This is deliberately not a hand-placed `emit()` next to the code that reads
 * the data. `useLiveQuery` hands back the derived collection, and subscribing to
 * *its* changes means DB is the one saying the result set moved — the same
 * standard the Query instrumentation holds itself to, where the cache reports
 * its own hits rather than us guessing at them.
 *
 * It fires for both reasons a result can change: a different row being selected,
 * and an optimistic write landing underneath. Both are the point — neither costs
 * a request.
 */
export function useLiveQueryInstrumentation(
  collection: Collection<any, any, any> | undefined,
  bus: EventBus,
  trace: string
) {
  useEffect(() => {
    if (!collection) return
    const subscription = collection.subscribeChanges((changes) => {
      if (changes.length === 0) return
      bus.emit(
        "db:live:read",
        `${changes.length} ${changes.length === 1 ? "row" : "rows"}`,
        trace
      )
    })
    return () => subscription.unsubscribe()
  }, [collection, bus, trace])
}
