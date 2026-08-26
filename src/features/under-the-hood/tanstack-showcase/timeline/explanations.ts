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
 * Two rules for the writing here, both learned the hard way:
 *
 * Plain words only — no cache, stale, or invalidate — since those are the words
 * being explained. A hint that needs its own hint has failed.
 *
 * And a blank line splits every hint in two: what just happened, then what it
 * cost you at the rung below. They're two different thoughts, and running them
 * together as one paragraph made people read the first half twice.
 */
const NETWORK_HINT: Record<RungId, string> = {
  0: `Every click asks the server again.

Nothing here remembers an answer. Open the same ticket twice and you wait twice.`,
  1: `Still a request — this is the first time anyone asked for this.

Ask a second time and there's no request at all.`,
  2: `The request still happens. It just isn't in your way.

The screen had already changed before this was sent.`,
}

const EVENT_HINT: Partial<Record<EventKind, string>> = {
  "query:cache:hit": `Nothing left the browser. The answer was already saved from last time.

Basic would have asked the server again, and you would have waited for it.`,

  "query:cache:stale": `The saved answer is shown at once, and a fresh one is fetched behind it.

Basic could only do one or the other: wait, or show something old.`,

  "query:cache:write": `The answer is kept, not thrown away.

In Basic it was gone the moment you left the screen, so coming back started from nothing.`,

  "query:invalidate": `The write says which data it changed. Anything showing that data refreshes itself.

In Basic you had to remember every screen the change touched and refetch each one by hand. Miss one and it quietly showed old data.`,

  "query:cache:remove": `The deleted ticket is dropped rather than refreshed. There's nothing left to ask for.

In Basic it could sit in a variable until something else happened to overwrite it.`,

  "query:error": `The failure is just state, so the screen can show it.

In Basic you kept an error flag by hand, next to a loading flag.`,

  "server:cancelled": `You moved on before this came back, so it was called off part-way.

In Basic the reply still arrives and gets thrown away. You wait either way.`,

  "db:live:read": `The row was read from the copy already on the client, so the title and status are on screen before the body has even been asked for.

It re-runs on its own whenever that row changes, which is why a change shows up here straight away.`,

  "db:optimistic:apply": `The change is on screen before the server is asked.

In React Query you write that yourself, and keep it in step with every screen showing the row.`,

  "db:optimistic:rollback": `The server said no, so the change undid itself.

In React Query you'd save a copy before the write and put it back by hand, everywhere it appeared.`,

  "sync:push": `The write goes out behind the screen instead of in front of it.`,

  "sync:ack": `The server agreed, so the change that was already on screen simply stays.`,
}

/** The hint for one row, or null when there's nothing worth saying. */
export function explainEvent(
  kind: EventKind | null,
  rung: RungId
): string | null {
  if (kind === null) return NETWORK_HINT[rung]
  return EVENT_HINT[kind] ?? null
}
