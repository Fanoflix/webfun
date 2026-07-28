import { CHATTER_ID, DEFAULT_BEAT_ENTER } from "./defaults"
import { MINUTE_MS } from "./time"
import type { Message, Segment } from "./types"

/** Sugar for the seed's timed segments, which are otherwise mostly punctuation. */
const beat = (text: string, hold: number): Segment => ({
  kind: "text",
  text,
  timing: { hold, enter: DEFAULT_BEAT_ENTER },
})

/**
 * The thread a first-time visitor lands in, and the canned pool the fake chatter
 * replies from.
 *
 * Timestamps are anchored to whenever the seed is first created rather than baked
 * in, so the conversation always reads as "just happened" instead of ageing into
 * `312d` for everyone who arrives after launch week. Once created it's persisted,
 * so it does age naturally from there — which is correct.
 */

/**
 * The opening conversation: **one message, three beats.**
 *
 * It used to be five messages of someone rattling on, which is the shape a chat
 * app forces on a single thought. Collapsing it into one timeline message is the
 * argument being made in the form it's being made about — the visitor's first
 * impression is a thought that arrived whole and unfolds at the pace it was
 * meant to be read at, rather than a wall of text explaining that it could.
 *
 * Beats hold more than one line each. Untimed segments join the beat above, so a
 * pair of lines lands together and then the thread waits.
 *
 * `minutesAgo` is how long before "now" it was sent.
 */
const SCRIPT: readonly {
  body: Segment[]
  minutesAgo: number
  mode?: Message["mode"]
}[] = [
  {
    mode: "timeline",
    minutesAgo: 4,
    body: [
      beat("ok hear me out", 1_000),
      { kind: "text", text: "...I think messages are broken" },

      beat(
        "...you know when someone sends a joke and the timing is the entire joke",
        2_600
      ),
      {
        kind: "text",
        text: "and the only way to land it is to go record a video of yourself typing it....... ",
      },

      beat("which is insane. it's a text message", 5_000),
      {
        kind: "text",
        text: "now imagine this... what if the message just knew how it was supposed to be read",
      },
    ],
  },
]

/**
 * The seed as bodies, for replaying it live after a reset — where the messages
 * arrive one at a time with the counterpart typing between them, rather than
 * appearing pre-written.
 */
export const SEED_BODIES: readonly {
  body: Segment[]
  mode?: Message["mode"]
}[] = SCRIPT.map(({ body, mode }) => ({ body, mode }))

export function createSeedThread(now: number): Message[] {
  return SCRIPT.map((line, i) => ({
    id: `seed-${i}`,
    authorId: CHATTER_ID,
    sentAt: now - line.minutesAgo * MINUTE_MS,
    body: line.body,
    reactions: [],
    ...(line.mode === undefined ? {} : { mode: line.mode }),
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
