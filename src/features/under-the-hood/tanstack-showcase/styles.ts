/**
 * Class strings and raw colours reused across the showcase.
 *
 * Anything that appears in more than one place lives here rather than being
 * retyped, so "what a panel looks like" is one edit and not a hunt. Component-
 * specific one-offs stay inline at their use site — this is for the shared
 * vocabulary only.
 */

/**
 * The outer shell holding the app and its docked network panel.
 *
 * One bordered box with no gap between the halves: they are meant to read as an
 * app with devtools attached, the way a browser docks them, rather than two
 * floating cards that happen to sit near each other.
 */
export const SHELL =
  "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border lg:flex-row"

/** One half of the shell. No border or radius of its own — the shell owns those. */
export const PANEL = "flex min-h-0 flex-col bg-background"

/** The bar across the top of a panel. */
export const PANEL_HEADER =
  "flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2"

/** Small caps label, used for column headers and panel titles. */
export const COLUMN_LABEL =
  "text-[10px] font-medium uppercase tracking-wider text-muted-foreground"

/** Monospaced metadata: endpoints, query keys, timings. */
export const MONO = "font-mono text-[11px] tabular-nums"

/** The network table's column track. Shared by the header and every row. */
export const NET_GRID = "grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3"

/**
 * Chrome DevTools' actual Network-panel colours.
 *
 * Kept as literal hex on purpose: the whole point is the flicker of
 * recognition, and mapping them onto the site's oklch tokens would lose it.
 * They appear nowhere else in webfun.
 *
 * Only `waiting` is used for the waterfall. Chrome splits a bar into queueing /
 * waiting / download, but our fake server has a single latency with no transfer
 * phase — inventing a download segment would be drawing a number we don't have.
 */
/**
 * Per-library accents for the timeline's source tags.
 *
 * `query` is TanStack Query's signature red, which is well attested. `db` is
 * NOT verified — `@tanstack/db` ships no brand colours and nothing in the
 * installed packages states one, so this is a stand-in chosen to sit apart from
 * the red without clashing. Swap it the moment the real value is known.
 */
export const LIBRARY = {
  query: "#cc7d33",
  db: "#0a448f",
  /** The sync engine isn't a separate product; it stays neutral. */
  sync: "#7c8698",
} as const

export const NETWORK = {
  /** TTFB / waiting — the orange that dominates a real waterfall. */
  waiting: "#f5a623",
  /** A failed request. */
  error: "#e5534b",
  /** Content download; reserved for when there is a real transfer phase to show. */
  download: "#4a9e5c",
} as const
