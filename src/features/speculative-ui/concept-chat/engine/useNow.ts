import { useEffect, useState } from "react"

/**
 * One clock for the whole feature.
 *
 * Every relative timestamp and the TTL countdown derive from this single value,
 * so a thread of fifty messages runs one interval rather than fifty.
 *
 * It ticks once a second unconditionally. An earlier version backed off to once a
 * minute when no message was inside the "Just now" window, but the countdown is
 * always on screen and always changing, so there is no longer a quiet period to
 * back off into.
 *
 * **Effect 1 of 4.** Justified: there is no way to observe the passage of time
 * without one.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(id)
  }, [])

  return now
}
