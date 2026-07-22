/**
 * Every tunable number in one place. Timings that shape how the demo *feels* are
 * here rather than inline, because they're the things most likely to want a nudge
 * once it's on screen.
 */

import type { Easing } from "motion/react"

import { resolveEase } from "@/features/motion/eases"
import { avatarUrl } from "./assets"
import type { Author } from "./types"

/**
 * The easing every animation in this feature uses. Defined once so "change the
 * feel" stays a one-line edit rather than a search across components — and taken
 * from the shared preset table so it matches the other motion demos.
 */
export const CHAT_EASE: Easing = resolveEase("expoOut")

export const VIEWER_ID = "viewer"
export const CHATTER_ID = "chatter"

export const VIEWER: Author = {
  id: VIEWER_ID,
  name: "You",
  avatarUrl: avatarUrl("viewer"),
}

/** The scripted counterpart. Obviously canned by design — no illusion of wit. */
export const CHATTER: Author = {
  id: CHATTER_ID,
  name: "FakeAmmar",
  avatarUrl: avatarUrl("chatter"),
}

export const AUTHORS: Record<string, Author> = {
  [VIEWER_ID]: VIEWER,
  [CHATTER_ID]: CHATTER,
}

/**
 * How long after you send before the reply lands. Long on purpose — the wait is
 * what makes the typing indicator worth having — but this is the first number to
 * turn down if the demo feels dead.
 */
export const REPLY_DELAY_MS = 5_000

/** How much of the tail of that wait the typing indicator is visible for. */
export const TYPING_LEAD_MS = 1_000

/** After the reply lands, how long before they react to *your* message. */
export const REACT_DELAY_MS = 2_000

/** Composer textarea ceiling before it starts scrolling. Mirrors `max-h-44`. */
export const COMPOSER_MAX_HEIGHT_PX = 176

/**
 * How long a conversation lives before it resets itself.
 *
 * This is a demo anyone can type into, so it shouldn't accumulate a stranger's
 * half-finished thoughts forever. The countdown is shown rather than hidden, and
 * can be pushed back at any time.
 */
export const THREAD_TTL_MS = 9.9 * 60_000

/**
 * After a reset the conversation is typed out live rather than reappearing
 * pre-written: the counterpart types for this long before the first line lands.
 */
export const REPLAY_FIRST_TYPING_MS = 2_000

/** The burst after the opener — they've got the thought out and are rattling on. */
export const REPLAY_BURST_TYPING_MS = 500

/** How many lines the burst covers before the pace settles again. */
export const REPLAY_BURST_COUNT = 2

/** Typing time once the burst is over. */
export const REPLAY_TYPING_MS = 1_100

/** The gap between a line landing and them starting to type the next one. */
export const REPLAY_BEAT_MS = 280

/**
 * How long they appear to type before line `index` of the replay.
 *
 * The shape is deliberate: a considered opener, three quick ones on top of each
 * other, then back to a normal pace for the punchline — which is roughly how
 * someone actually types out an idea they're excited about.
 */
export function replayTypingFor(index: number): number {
  if (index === 0) return REPLAY_FIRST_TYPING_MS
  if (index <= REPLAY_BURST_COUNT) return REPLAY_BURST_TYPING_MS
  return REPLAY_TYPING_MS
}
