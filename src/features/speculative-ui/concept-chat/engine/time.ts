/**
 * Timestamp formatting. Pure — `now` is always passed in, never read from the
 * clock here, so every function is directly testable and the list can re-derive
 * every label from a single shared tick.
 */

export const MINUTE_MS = 60_000
export const HOUR_MS = 60 * MINUTE_MS
export const DAY_MS = 24 * HOUR_MS

/** Local-midnight epoch ms for the day `ts` falls in. Used to bucket dividers. */
export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Whole days between two instants, counted by calendar day, not elapsed hours. */
export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS)
}

/**
 * The label beside an author's name. Stays relative rather than switching to a
 * clock time:
 *
 * `Just now` (<60s) → `5m` → `3h` → `Yesterday` → `12 Mar`
 *
 * Anything in the future (clock skew, a restored thread) clamps to `Just now`
 * rather than rendering a negative age.
 */
export function formatRelative(sentAt: number, now: number): string {
  const elapsed = now - sentAt
  if (elapsed < MINUTE_MS) return "Just now"
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m`

  const days = daysBetween(sentAt, now)
  if (days === 0) return `${Math.floor(elapsed / HOUR_MS)}h`
  if (days === 1) return "Yesterday"
  return formatDate(sentAt)
}

/** The date divider's label: `Today` / `Yesterday` / `12 Mar`. */
export function formatDayLabel(dayStart: number, now: number): string {
  const days = daysBetween(dayStart, now)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return formatDate(dayStart)
}

/** `12 Mar`, plus the year once it's a different one. */
function formatDate(ts: number): string {
  const d = new Date(ts)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  })
}

/**
 * `9:59` — the time-to-live countdown.
 *
 * Clamps at zero rather than going negative: expiry is handled by a timer, and a
 * render landing a few milliseconds the wrong side of it shouldn't flash `-0:01`.
 */
export function formatCountdown(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1_000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}
