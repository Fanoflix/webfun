/**
 * Makeshift, client-side feature flags for a staged launch.
 *
 * The site ships every tool; this module only decides what is *listed and
 * reachable*. Which tools are public comes from the `VITE_RELEASED` env var, so
 * a launch is an env change on the host — no code edit. A secret unlock link
 * (`?key=…`) flips a visitor to "see everything", which is how friends get the
 * whole site on day one.
 *
 * ⚠️ This is obscurity, not security. Every tool's code is in the JS bundle
 * regardless of the flags, so anyone who digs can find an unreleased tool. It is
 * meant to keep a launch tidy, not to protect secrets.
 */

/** Every gateable tool, keyed by its route slug (the path without the slash). */
export type ToolKey =
  | "dithering"
  | "anti-aliasing"
  | "low-res-video"
  | "character-flow"
  | "style-flow"
  | "future-table"

export const ALL_TOOLS: readonly ToolKey[] = [
  "dithering",
  "anti-aliasing",
  "low-res-video",
  "character-flow",
  "style-flow",
  "future-table",
]

/** Narrow an arbitrary string to a `ToolKey`. */
export function isToolKey(value: string): value is ToolKey {
  return (ALL_TOOLS as readonly string[]).includes(value)
}

/**
 * Parse a comma-separated slug list (the `VITE_RELEASED` format) into tool keys,
 * dropping anything that isn't a real tool so a typo can never crash the site.
 */
export function parseReleased(raw: string | undefined): readonly ToolKey[] {
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(isToolKey)
}

/**
 * Tools visible to the public right now.
 *
 * Set `VITE_RELEASED` on the host to a comma-separated slug list, e.g.
 * `VITE_RELEASED="dithering,anti-aliasing"`, and redeploy alongside each post.
 *
 * Defaults: in dev, everything is released (so local work isn't gated). In a
 * production build with the var unset we fail *closed* — nothing is listed —
 * so a forgotten env var can never leak the whole drip at once.
 */
export const RELEASED: readonly ToolKey[] = import.meta.env.VITE_RELEASED
  ? parseReleased(import.meta.env.VITE_RELEASED)
  : import.meta.env.DEV
    ? ALL_TOOLS
    : []

/** Query param that unlocks everything: `/?key=<secret>`. */
export const UNLOCK_PARAM = "key"

/** Query param that clears the unlock again: `/?lock=1` (handy for testing). */
export const LOCK_PARAM = "lock"

/** localStorage key holding the unlock, so it survives reloads. */
export const UNLOCK_STORAGE_KEY = "webfun:unlocked"

/**
 * The secret in the friends link. Override per deploy with `VITE_UNLOCK_SECRET`.
 * Not a credential — it only reveals demos early.
 */
export const UNLOCK_SECRET: string =
  import.meta.env.VITE_UNLOCK_SECRET ?? "backstage"

/** Is this tool public without an unlock? */
export function isReleased(tool: ToolKey): boolean {
  return RELEASED.includes(tool)
}

/**
 * The tool a route belongs to, or `null` for any non-tool page (home, 404…).
 * Tool keys *are* their route slugs, so the URL is the single source of truth.
 */
export function toolFromPathname(pathname: string): ToolKey | null {
  const slug = pathname.replace(/^\/+/, "").replace(/\/+$/, "")
  return isToolKey(slug) ? slug : null
}
