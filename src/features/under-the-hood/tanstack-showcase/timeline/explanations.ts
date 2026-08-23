import type { RungId } from "../engine/rungs"
import type { EventKind } from "../engine/types"

/**
 * Why each line in the log matters, phrased against the rung below it.
 *
 * The log shows *what* happened; this says *why it's better than last time* —
 * which is the entire argument of the entry, and the part that's invisible if
 * you're only looking at one rung. At rung 0 there is no rung below, so the
 * text names the flaw instead: that's the baseline everything else improves on.
 *
 * Deliberately plain: no cache/stale/invalidate vocabulary, since those are the
 * words being explained.
 */
const NETWORK_HINT: Record<RungId, string> = {
  0: "Every navigation asks the server again. Nothing here remembers an answer, so opening the same ticket twice costs two round-trips and shows two spinners.",
  1: "Still a request — this data hadn't been fetched before. The difference shows up the *second* time you ask for it, when there's no request at all.",
  2: "The request still happens, it's just not in your way. The screen already changed before this was sent.",
}

const EVENT_HINT: Partial<Record<EventKind, string>> = {
  "query:cache:hit":
    "Basic would have sent a request here. The answer was already kept from last time, so nothing left the browser and there was nothing to wait for.",
  "query:cache:stale":
    "Basic had no way to say “show this now, check it later”. The old answer paints immediately while a fresh one is fetched behind it.",
  "query:cache:write":
    "The answer is kept rather than thrown away. In Basic it was dropped the moment the component unmounted, so the next visit started from nothing.",
  "query:invalidate":
    "One call marks everything about tickets as out of date. In Basic you had to remember every list and detail a write touched and refetch each one by hand — and forgetting one showed stale data with no error.",
  "query:error":
    "The failure is captured as state you can render. In Basic you were tracking an error flag by hand next to a loading flag.",
  "db:live:read":
    "React Query still paid for the first open of every ticket. Here the rows are already on the client, so this is a local lookup — no request at all, not even once.",
  "db:optimistic:apply":
    "The change is on screen before the server is even asked. React Query would leave you waiting for the round-trip unless you hand-wrote the optimistic update, and kept it in step with every view.",
  "db:optimistic:rollback":
    "The undo is automatic. With React Query you'd be restoring saved copies yourself, and you'd have to know every place the write had touched.",
  "sync:push":
    "The write goes out behind the interface instead of in front of it.",
  "sync:ack":
    "The server agreed, so the change that was already on screen simply stays.",
}

/** The hint for one row, or null when there's nothing worth saying. */
export function explainEvent(
  kind: EventKind | null,
  rung: RungId
): string | null {
  if (kind === null) return NETWORK_HINT[rung]
  return EVENT_HINT[kind] ?? null
}
