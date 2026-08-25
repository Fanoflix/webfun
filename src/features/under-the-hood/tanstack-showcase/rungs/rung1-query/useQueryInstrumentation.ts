import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

import type { EventBus } from "../../engine/events"

/**
 * Turns TanStack Query's own cache notifications into showcase events.
 *
 * This is the honest way to visualise the cache: subscribing to the real
 * `QueryCache` and reporting what it says. Nothing here decides *when* a cache
 * hit happens — Query does, and we translate. If we hand-emitted these from the
 * call sites instead, the diagram would be showing our beliefs about Query
 * rather than Query.
 */
export function useQueryInstrumentation(bus: EventBus) {
  const queryClient = useQueryClient()

  // A genuine outside-React subscription, which is what effects are for.
  useEffect(() => {
    const cache = queryClient.getQueryCache()
    return cache.subscribe((event) => {
      const key = JSON.stringify(event.query.queryKey)
      switch (event.type) {
        case "observerAdded": {
          // A component mounted and an answer was already waiting. Whether that
          // is the end of the story depends on whether Query still trusts it:
          // inside the stale window nothing is requested at all, outside it the
          // cached value paints *and* a refetch goes out behind it
          // (stale-while-revalidate).
          //
          // Reporting both as "no request" was a real bug: the timeline claimed
          // a free read and then immediately showed the request it had just
          // promised wasn't happening.
          if (event.query.state.data === undefined) break
          bus.emit(
            event.query.isStale() ? "query:cache:stale" : "query:cache:hit",
            key,
            key
          )
          break
        }
        case "removed": {
          // A key thrown away rather than marked stale — what a delete does to
          // the record it just removed. Without this the cleanup happens
          // silently and the log implies the entry is still sitting there.
          bus.emit("query:cache:remove", key, key)
          break
        }
        case "updated": {
          switch (event.action.type) {
            case "fetch":
              bus.emit("query:fetch:start", key, key)
              break
            case "success":
              bus.emit("query:cache:write", key, key)
              break
            case "error":
              bus.emit("query:error", key, key)
              break
            case "invalidate":
              bus.emit("query:invalidate", key, key)
              break
          }
          break
        }
      }
    })
  }, [queryClient, bus])
}
