import { CHATTER_ID } from "./defaults"
import { MINUTE_MS } from "./time"
import type { Message } from "./types"

/**
 * The thread a first-time visitor lands in, and the canned pool the fake chatter
 * replies from.
 *
 * Timestamps are anchored to whenever the seed is first created rather than baked
 * in, so the conversation always reads as "just happened" instead of ageing into
 * `312d` for everyone who arrives after launch week. Once created it's persisted,
 * so it does age naturally from there — which is correct.
 */

/** Minutes before "now" that each seeded line was sent. */
const SCRIPT: readonly { text: string; minutesAgo: number }[] = [
  { text: "ok hear me out", minutesAgo: 6 },
  {
    text: "...you know when someone sends a joke and the timing is the entire joke",
    minutesAgo: 6,
  },
  {
    text: "and the only way to land it is to go record a video of yourself typing it....... ",
    minutesAgo: 5,
  },
  { text: "which is insane. it's a text message", minutesAgo: 5 },
  {
    text: "now imagine this... what if the message just knew how it was supposed to be read",
    minutesAgo: 4,
  },
]

/**
 * The seed as plain lines, for replaying it live after a reset — where the
 * messages arrive one at a time with the counterpart typing between them, rather
 * than appearing pre-written.
 */
export const SEED_LINES: readonly string[] = SCRIPT.map((line) => line.text)

export function createSeedThread(now: number): Message[] {
  return SCRIPT.map((line, i) => ({
    id: `seed-${i}`,
    authorId: CHATTER_ID,
    sentAt: now - line.minutesAgo * MINUTE_MS,
    body: [{ kind: "text", text: line.text }],
    reactions: [],
  }))
}

/**
 * What the chatter says back. One is picked at random per reply — deliberately
 * generic, because it has no idea what you wrote and shouldn't pretend to.
 */
export const REPLY_POOL: readonly string[] = [
  "right?? that's exactly what I mean",
  "see now you get it",
  "ok but imagine that with a gif halfway through",
]
