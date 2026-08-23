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
 * A dropdown with its chrome taken off.
 *
 * `SelectTrigger` is already `w-fit`, so the chevron sits right after the value
 * once no width is forced on it — the fixed widths were what pushed it out to
 * the edge. The underline goes too: inside the app these read as inline
 * properties on a record, not as form fields. The focus ring is deliberately
 * left intact, since it's the only thing marking the control for keyboard use.
 */
export const BARE_SELECT = "w-auto border-b-transparent"

/**
 * Ticket status colours: blue for in-flight, green for finished — the scheme
 * people already read without a legend.
 *
 * Todo is absent on purpose. Nothing has happened to a todo yet, so it gets an
 * empty ring rather than a fill, and it takes its colour from the foreground so
 * it stays visible in both themes — "white circle" in the dark one.
 *
 * Literal hex rather than theme tokens because these are semantic to the fake
 * product, not to webfun, and the app runs on a deliberately colourless grey
 * palette so these are the only hues in it.
 */
export const STATUS_COLOR: Record<"in-progress" | "done", string> = {
  "in-progress": "#4a9ee0",
  done: "#4caf7d",
}

/**
 * A visibly selected toggle.
 *
 * The shadcn toggle marks its selected state with `aria-pressed:bg-muted` — the
 * same colour as its hover — so "selected" and "the mouse is here" look
 * identical, and in light mode muted against the background is barely a shade.
 * Inverting instead makes the active rung and mode unmistakable in both themes.
 */
export const TOGGLE_SELECTED =
  "aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:hover:bg-foreground"

/**
 * Row hover in the network log.
 *
 * Tinted from the foreground rather than an accent token: it then flips with the
 * theme automatically and stays visible on both the light and dark devtools
 * surfaces, where `bg-accent/40` was too close to the panel to see at all.
 */
export const ROW_HOVER = "hover:bg-foreground/[0.07]"

/**
 * The colour of something the reader did.
 *
 * Every other line in the log is a library or the network reacting; these are
 * the moments a person touched the app. Violet because nothing else in the
 * panel uses it — Query's red, DB's teal and Chrome's orange are all spoken
 * for — so a glance down the column separates cause from effect.
 */
export const INTERACTION_COLOR = "#8b5cf6"

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
