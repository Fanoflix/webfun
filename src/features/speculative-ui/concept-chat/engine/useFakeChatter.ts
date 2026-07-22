import { useCallback, useEffect, useRef, useState } from "react"

import {
  CHATTER_ID,
  REACT_DELAY_MS,
  REPLAY_BEAT_MS,
  REPLY_DELAY_MS,
  TYPING_LEAD_MS,
  replayTypingFor,
} from "./defaults"
import { CHATTER_REACTIONS } from "./emoji"
import { REPLY_POOL, SEED_LINES } from "./seed"
import type { AuthorId, Segment } from "./types"

/**
 * The scripted counterpart.
 *
 * Obvious by design — one reply drawn at random from three, with no idea what you
 * wrote. It exists to demonstrate the typing indicator and the reaction
 * animation, not to seem clever.
 *
 * It owns every timer in the feature, which is why the seed replay lives here
 * too: after a reset it types the opening conversation out live, one line at a
 * time. Same machinery, and only one place that has to be cleaned up.
 *
 * **Effect 3 of 3.** Justified: timers are the entire feature, and the cleanup is
 * what lets a mid-flight reply survive an unmount without warning.
 */

type Params = {
  append: (authorId: AuthorId, body: Segment[]) => string
  toggleReaction: (messageId: string, emoji: string, authorId: AuthorId) => void
}

export type FakeChatter = {
  /** Whether to show the typing indicator right now. */
  isTyping: boolean
  /** Call when the visitor sends. Ignored while a reply is already in flight. */
  notifySent: (messageId: string) => void
  /** Type the opening conversation out live. Used after a reset. */
  replaySeed: () => void
}

function pick<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)]
}

export function useFakeChatter({ append, toggleReaction }: Params): FakeChatter {
  const [isTyping, setIsTyping] = useState(false)

  /**
   * Every timer currently in flight, so unmount can clear all of them. A reply
   * lands 15 seconds out and the reaction 2 seconds after that — plenty of room
   * to navigate away mid-sequence.
   */
  const timers = useRef<number[]>([])
  /** Guards against queueing a second reply while one is pending. */
  const pending = useRef(false)

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay)
    timers.current.push(id)
  }, [])

  const clearAll = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
  }, [])

  const notifySent = useCallback(
    (messageId: string) => {
      if (pending.current) return
      pending.current = true

      schedule(() => setIsTyping(true), REPLY_DELAY_MS - TYPING_LEAD_MS)

      schedule(() => {
        setIsTyping(false)
        append(CHATTER_ID, [{ kind: "text", text: pick(REPLY_POOL) }])
        pending.current = false

        // They reply first, then react to what you said — the order a person
        // would do it in, and what makes the reaction animation legible.
        schedule(
          () => toggleReaction(messageId, pick(CHATTER_REACTIONS), CHATTER_ID),
          REACT_DELAY_MS
        )
      }, REPLY_DELAY_MS)
    },
    [append, schedule, toggleReaction]
  )

  /**
   * Types the opening conversation out rather than restoring it. The first line
   * is worth waiting two seconds for; after that they're mid-thought, so the
   * pauses shorten.
   *
   * Any in-flight reply is dropped first — a reset is a reset, and a message
   * from the previous conversation landing afterwards would be a ghost.
   */
  const replaySeed = useCallback(() => {
    clearAll()
    pending.current = false
    setIsTyping(false)

    let elapsed = 0
    SEED_LINES.forEach((text, index) => {
      const typingFor = replayTypingFor(index)

      // The first one starts typing *now*, not on the next tick — otherwise the
      // thread sits visibly empty for a frame before anything happens.
      if (elapsed === 0) {
        setIsTyping(true)
      } else {
        schedule(() => setIsTyping(true), elapsed)
      }
      elapsed += typingFor

      schedule(() => {
        setIsTyping(false)
        append(CHATTER_ID, [{ kind: "text", text }])
      }, elapsed)
      elapsed += REPLAY_BEAT_MS
    })
  }, [append, clearAll, schedule])

  useEffect(() => clearAll, [clearAll])

  return { isTyping, notifySent, replaySeed }
}
