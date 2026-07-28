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
 * The opening conversation: **one message, ten beats.**
 *
 * It's a single timeline message rather than a run of ordinary ones, which is
 * the argument being made in the form it's being made about — the visitor's
 * first impression is a thought that arrived whole and unfolds at the pace it
 * was meant to be read at, rather than a wall of text explaining that it could.
 *
 * The script does three jobs in order and never announces any of them: it warms
 * up on something everyone has an opinion about, uses the pauses to land a
 * punchline that only works *because* it was timed, and then quietly explains
 * that you can type back.
 *
 * A beat's `hold` is the pause *after* it, so each number below is the gap
 * before the following line — the last one's is never read.
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
      beat(
        "Lord of the rings is probably the greatest piece of fiction ever captured on screen",
        3_000
      ),
      beat("A close second to me is....", 2_000),
      beat("World of Warcraft", 2_500),
      beat("that isn't captured well on screen though, but", 3_500),
      beat("it's a really cool story as well!", 5_000),
      beat("Here is my favorite character from warcraft", 3_000),
      {
        kind: "gif",
        assetId: "lich",
        timing: { hold: 5_500, enter: DEFAULT_BEAT_ENTER },
      },
      beat("btw....", 2_000),
      beat(
        "you can chat here and I will blurt out random messages at you as a simulator.",
        3_500
      ),
      beat("psst: don't forget to give feedback to the real Ammar~ :)", 5_000),
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
