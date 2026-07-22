import { useCallback, useLayoutEffect, useRef } from "react"

/**
 * Keeps a scroll container pinned to the bottom as content arrives — but only if
 * the person was already there.
 *
 * The behaviour that matters is the negative one: if someone has scrolled up to
 * read history, a new message must not yank them back down. So "was I at the
 * bottom before this render?" is recorded on scroll, and acted on after layout.
 *
 * **Effect 2 of 3.** Justified: it has to run after the DOM has the new content
 * but before the browser paints, or the jump is visible.
 */

/** How far from the bottom still counts as "at the bottom". */
const THRESHOLD_PX = 64

/**
 * `deps` is anything whose change can alter the thread's height. Note that this
 * is *not* just "a message arrived": adding a reaction grows the last message
 * without changing how many there are, so keying on the message count alone
 * leaves the newest content sitting below the fold.
 *
 * Passing the messages array itself covers every case, since the store commits a
 * fresh array on each mutation — identity changes exactly when content does.
 */
export function useStickToBottom(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)

  const onScroll = useCallback(() => {
    const el = ref.current
    if (el === null) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    pinned.current = distance <= THRESHOLD_PX
  }, [])

  useLayoutEffect(() => {
    const el = ref.current
    if (el === null || !pinned.current) return
    el.scrollTop = el.scrollHeight
    // `deps` has a stable length at every call site, so spreading it is safe.
  }, deps)

  return { ref, onScroll }
}
