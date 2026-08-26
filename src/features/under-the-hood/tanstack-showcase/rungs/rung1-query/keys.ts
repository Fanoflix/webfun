/**
 * How ticket queries are keyed, in one place.
 *
 * Rung 2 imports these too — its collection is fed by rung 1's Query client, so
 * a ticket body it fetches lands in the same cache under the same key. Two
 * copies of this file would be two chances for those keys to drift apart, and
 * the symptom would be a silent double-fetch that looks like a Query bug.
 */
export const ticketKeys = {
  all: ["tickets"] as const,
  list: () => ["tickets", "list"] as const,
  detail: (id: number) => ["tickets", "detail", id] as const,
}

/**
 * The string form of a key, used as the correlation id on events. Matches what
 * the cache subscription reports, so a request and the cache write that follows
 * it line up in the timeline.
 */
export const traceOf = (key: readonly unknown[]) => JSON.stringify(key)

/**
 * Where the detail observer parks when nothing is selected.
 *
 * `enabled` stops it fetching, but the observer still registers a query under
 * whatever key it was given — so a placeholder like `detail(-1)` would sit in
 * the cache under the `tickets` prefix and turn up in every invalidation
 * cascade. Parking it outside that prefix keeps the cache honest: there is no
 * ticket query when there is no ticket.
 */
export const IDLE_DETAIL_KEY = ["no-ticket-selected"] as const

/**
 * How long an answer counts as fresh. Deliberately long: within this window
 * re-selecting a ticket paints with no request at all, which is the thing the
 * timeline is there to show.
 */
export const STALE_TIME = 30_000
