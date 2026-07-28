import { useCallback, useMemo, useRef, useState } from "react"

import { THREAD_TTL_MS, VIEWER_ID } from "./defaults"
import { groupThread } from "./grouping"
import { clearThread, loadThread, saveThread } from "./storage"
import { createSeedThread } from "./seed"
import type { AuthorId, Message, Segment, ThreadItem } from "./types"

/**
 * The thread: what's in it, when it expires, and the things that can change it.
 *
 * Persistence happens **inside the commit path**, not in an effect watching state.
 * Every mutation already knows the exact next thread, so there's nothing to
 * observe — a save-on-change effect would only add a render's worth of lag and a
 * dependency array to get wrong.
 */

export type ChatApi = {
  messages: Message[]
  /** Messages collapsed into author runs with date dividers — what the list renders. */
  items: ThreadItem[]
  /** Epoch ms at which this conversation is discarded. */
  expiresAt: number
  /**
   * Add a message from anyone. Returns the new id, which callers need — the fake
   * chatter reacts to the message you just sent, and can only find it by id.
   */
  append: (authorId: AuthorId, body: Segment[], mode?: Message["mode"]) => string
  /** Add the emoji if this author hasn't used it here, remove it if they have. */
  toggleReaction: (messageId: string, emoji: string, authorId?: AuthorId) => void
  /**
   * Record that a timeline message played to the end, so a reload brings it back
   * finished rather than asking to be watched again.
   */
  markPlayed: (messageId: string) => void
  /**
   * Empty the thread. The kill switch — note it does *not* reseed: the seed is
   * typed back in live by the fake chatter, so this leaves a blank thread for it
   * to land in.
   */
  clear: () => void
  /** Push expiry back to a full TTL from now, leaving the messages alone. */
  extend: () => void
}

type ThreadState = {
  messages: Message[]
  expiresAt: number
}

/**
 * Load what's stored, or mint a fresh seed and persist it immediately — so the
 * seed's "minutes ago" timestamps are fixed at first visit and then age normally,
 * instead of resetting to six-minutes-old on every reload.
 *
 * `loadThread` already treats expired data as absent, so nothing here has to
 * check the clock.
 */
function initialThread(): ThreadState {
  const stored = loadThread()
  if (stored !== null) return stored

  const fresh: ThreadState = {
    messages: createSeedThread(Date.now()),
    expiresAt: Date.now() + THREAD_TTL_MS,
  }
  saveThread(fresh)
  return fresh
}

export function useChat(): ChatApi {
  const [state, setState] = useState<ThreadState>(initialThread)

  /**
   * The authoritative latest state, updated synchronously by `commit`.
   *
   * Every mutation goes through `commit`, so this can never drift — and having it
   * means updates read from a ref instead of a `setState` callback. That matters
   * twice over: the save stays outside the updater (React may invoke updaters
   * more than once, and a write to localStorage has no business running in
   * there), and a reply firing from a 15-second timer reads the current thread
   * rather than whatever it closed over.
   */
  const latest = useRef(state)

  const commit = useCallback((update: (current: ThreadState) => ThreadState) => {
    const next = update(latest.current)
    latest.current = next
    setState(next)
    saveThread(next)
  }, [])

  const append = useCallback(
    (authorId: AuthorId, body: Segment[], mode?: Message["mode"]) => {
      const message: Message = {
        id: crypto.randomUUID(),
        authorId,
        sentAt: Date.now(),
        body,
        reactions: [],
        ...(mode === undefined ? {} : { mode }),
      }
      commit((current) => ({
        ...current,
        messages: [...current.messages, message],
      }))
      return message.id
    },
    [commit]
  )

  const toggleReaction = useCallback(
    (messageId: string, emoji: string, authorId: AuthorId = VIEWER_ID) => {
      commit((current) => ({
        ...current,
        messages: current.messages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                reactions: toggle(message.reactions, emoji, authorId),
              }
            : message
        ),
      }))
    },
    [commit]
  )

  /**
   * Idempotent, and deliberately a no-op on an already-played message: playback
   * ends once, but replay ends again, and a second write would be a pointless
   * render and a pointless trip to localStorage.
   */
  const markPlayed = useCallback(
    (messageId: string) => {
      const existing = latest.current.messages.find((m) => m.id === messageId)
      if (existing === undefined || existing.played === true) return
      commit((current) => ({
        ...current,
        messages: current.messages.map((message) =>
          message.id === messageId ? { ...message, played: true } : message
        ),
      }))
    },
    [commit]
  )

  /** Clearing starts the clock again: a fresh conversation gets a full lifetime. */
  const clear = useCallback(() => {
    clearThread()
    commit(() => ({ messages: [], expiresAt: Date.now() + THREAD_TTL_MS }))
  }, [commit])

  const extend = useCallback(() => {
    commit((current) => ({ ...current, expiresAt: Date.now() + THREAD_TTL_MS }))
  }, [commit])

  const items = useMemo(() => groupThread(state.messages), [state.messages])

  return {
    messages: state.messages,
    items,
    expiresAt: state.expiresAt,
    append,
    toggleReaction,
    markPlayed,
    clear,
    extend,
  }
}

/**
 * Reaction rows carry the authors who used them, so the count and "did I react"
 * both derive from one array. A row that empties out is dropped rather than left
 * behind showing zero.
 */
function toggle(
  reactions: Message["reactions"],
  emoji: string,
  authorId: AuthorId
): Message["reactions"] {
  const existing = reactions.find((r) => r.emoji === emoji)
  if (existing === undefined) {
    return [...reactions, { emoji, by: [authorId] }]
  }

  const by = existing.by.includes(authorId)
    ? existing.by.filter((id) => id !== authorId)
    : [...existing.by, authorId]

  if (by.length === 0) {
    return reactions.filter((r) => r.emoji !== emoji)
  }
  return reactions.map((r) => (r.emoji === emoji ? { ...r, by } : r))
}
