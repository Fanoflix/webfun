import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { AUTHORS, CHATTER, VIEWER, VIEWER_ID } from "./defaults"
import { loadSkipResetConfirm, saveSkipResetConfirm } from "./storage"
import { useChat } from "./useChat"
import { useComposer } from "./useComposer"
import { useFakeChatter } from "./useFakeChatter"
import { useNow } from "./useNow"
import { useStickToBottom } from "./useStickToBottom"
import type { Author, Segment, ThreadItem } from "./types"

/**
 * Everything the page needs, assembled in one place.
 *
 * The components below this are view-only: they take data and callbacks and make
 * no decisions. This is the single seam where the thread, the clock, the draft,
 * the scripted counterpart and the scroll behaviour meet.
 */

export type ConceptChatApi = {
  items: ThreadItem[]
  /** Shared clock — every relative timestamp and the countdown derive from this. */
  now: number
  viewer: Author
  authorFor: (authorId: string) => Author
  isTyping: boolean
  /** Load time — messages newer than this animate in. */
  mountedAt: number
  composer: ReturnType<typeof useComposer>
  toggleReaction: (messageId: string, emoji: string) => void
  reset: () => void
  /** Milliseconds until the conversation discards itself. Never negative. */
  remainingMs: number
  /** Push the expiry back to a full lifetime. */
  extend: () => void
  /** Whether the reset button skips its confirmation. */
  skipResetConfirm: boolean
  setSkipResetConfirm: (skip: boolean) => void
  scroll: ReturnType<typeof useStickToBottom>
}

export function useConceptChat(): ConceptChatApi {
  const { messages, items, expiresAt, append, toggleReaction, clear, extend } =
    useChat()

  const now = useNow()
  const { isTyping, notifySent, replaySeed } = useFakeChatter({
    append,
    toggleReaction,
  })

  /**
   * Reset empties the thread and has the counterpart type the opening
   * conversation back in, rather than restoring it pre-written. Splitting it this
   * way keeps `useChat` a plain store: it knows how to empty itself, and nothing
   * about who fills it back up.
   */
  const reset = useCallback(() => {
    clear()
    replaySeed()
  }, [clear, replaySeed])

  /**
   * Expiry fires on a timer rather than by watching the countdown reach zero. A
   * render-time check would only fire on the next tick, and would miss entirely
   * while the tab is backgrounded and timers are throttled — this way the reset
   * happens as soon as the tab is live again.
   *
   * **Effect 4 of 4.**
   */
  const resetRef = useRef(reset)
  resetRef.current = reset

  useEffect(() => {
    const delay = Math.max(0, expiresAt - Date.now())
    const id = window.setTimeout(() => resetRef.current(), delay)
    return () => window.clearTimeout(id)
    // Re-armed whenever the expiry moves — extending or resetting both change it.
  }, [expiresAt])

  const handleSend = useCallback(
    (body: Segment[]) => {
      const id = append(VIEWER_ID, body)
      notifySent(id)
    },
    [append, notifySent]
  )

  const composer = useComposer(handleSend)

  const mountedAt = useRef(Date.now()).current

  // `messages` covers every height change inside the scroller, including a
  // reaction added to the last message (which leaves the count untouched). The
  // typing indicator lives below the composer, outside this element, so it
  // can't move the thread and isn't a dependency.
  const scroll = useStickToBottom([messages])

  const [skipResetConfirm, setSkip] = useState(loadSkipResetConfirm)

  const setSkipResetConfirm = useCallback((skip: boolean) => {
    setSkip(skip)
    saveSkipResetConfirm(skip)
  }, [])

  const authorFor = useCallback(
    (authorId: string): Author => AUTHORS[authorId] ?? CHATTER,
    []
  )

  const react = useCallback(
    (messageId: string, emoji: string) => toggleReaction(messageId, emoji),
    [toggleReaction]
  )

  const remainingMs = Math.max(0, expiresAt - now)

  return useMemo(
    () => ({
      items,
      now,
      viewer: VIEWER,
      authorFor,
      isTyping,
      mountedAt,
      composer,
      toggleReaction: react,
      reset,
      remainingMs,
      extend,
      skipResetConfirm,
      setSkipResetConfirm,
      scroll,
    }),
    [
      authorFor,
      composer,
      extend,
      isTyping,
      items,
      mountedAt,
      now,
      react,
      remainingMs,
      reset,
      scroll,
      setSkipResetConfirm,
      skipResetConfirm,
    ]
  )
}
