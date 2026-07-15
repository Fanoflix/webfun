import { useEffect, useState } from "react"

import type { ToolKey } from "./flags"
import {
  isReleased,
  LOCK_PARAM,
  UNLOCK_PARAM,
  UNLOCK_SECRET,
  UNLOCK_STORAGE_KEY,
} from "./flags"

export type Flags = {
  /**
   * Whether the unlock state has been read on the client yet. Always `false` on
   * the server and for the first client render, so gates must wait for this
   * before deciding a tool is off-limits.
   */
  ready: boolean
  /** Is this visitor holding the backstage key? */
  unlocked: boolean
  /** Should this tool be listed / reachable for this visitor? */
  isVisible: (tool: ToolKey) => boolean
  /** Drop the unlock (used by `?lock=1`, and handy to preview the public site). */
  lock: () => void
}

/** localStorage can throw (private mode, blocked cookies) — never break the site. */
function readStored(): boolean {
  try {
    return window.localStorage.getItem(UNLOCK_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function writeStored(unlocked: boolean): void {
  try {
    if (unlocked) window.localStorage.setItem(UNLOCK_STORAGE_KEY, "1")
    else window.localStorage.removeItem(UNLOCK_STORAGE_KEY)
  } catch {
    // Non-fatal: the unlock just won't survive a reload.
  }
}

/**
 * Resolves whether this visitor sees the staged site or all of it.
 *
 * Starts locked so the server render and the first client render agree (no
 * hydration mismatch), then resolves from the URL / localStorage in an effect:
 * `?key=<secret>` unlocks and persists, `?lock=1` clears it.
 */
export function useFlags(): Flags {
  const [unlocked, setUnlocked] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    let next: boolean
    if (params.get(LOCK_PARAM)) {
      next = false
      writeStored(false)
    } else if (params.get(UNLOCK_PARAM) === UNLOCK_SECRET) {
      next = true
      writeStored(true)
    } else {
      next = readStored()
    }
    setUnlocked(next)
    setReady(true)
  }, [])

  const lock = () => {
    writeStored(false)
    setUnlocked(false)
  }

  const isVisible = (tool: ToolKey) => unlocked || isReleased(tool)

  return { ready, unlocked, isVisible, lock }
}
