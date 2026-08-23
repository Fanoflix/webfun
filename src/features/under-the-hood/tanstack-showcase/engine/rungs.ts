/**
 * The ladder.
 *
 * Each rung is a *real* implementation of the same data layer behind the same
 * UI — not a simulation and not a config flag. They all satisfy one contract, so
 * the app is written once and the differences show up where they actually live:
 * in behaviour, and in the source you can read in Code mode.
 *
 * A ladder rather than independent per-tool toggles, because n toggles means 2^n
 * combinations, most of them meaningless, each needing a working implementation.
 * Stepping is also the order you'd adopt these tools in real life.
 */
export type RungId = 0 | 1 | 2

/**
 * How long the reset animation runs when you change rung.
 *
 * The new rung is not mounted until this elapses — the point of the pause is
 * that you watch the *whole* data layer start from cold, so its first fetch has
 * to happen where you can see it, not behind the blur.
 */
export const RUNG_SWITCH_MS = 600

export type Rung = {
  id: RungId
  name: string
  /** What the data layer is made of at this rung. */
  stack: string
  /** The sentence that says why you'd climb to it. */
  gain: string
  /**
   * Plain-English explanation, shown on hover. Written for someone who has
   * never used any of these libraries: no cache/stale/invalidate vocabulary,
   * because the whole point is to explain what those words mean.
   */
  blurb: string
  available: boolean
}

export const RUNGS: Rung[] = [
  {
    id: 0,
    name: "Basic",
    stack: "useState + fetch",
    gain: "Every navigation is a request. Every request is a spinner.",
    blurb:
      "Ask the server for the data every time you need it, and hold it in a variable. It works, but nothing is remembered — open the same ticket twice and you wait twice.",
    available: true,
  },
  {
    id: 1,
    name: "React Query",
    stack: "useQuery + useMutation",
    gain: "Seen it before? It paints instantly. No request at all.",
    blurb:
      "Keeps a copy of every answer the server gave, so asking again is instant. It also notices when a copy has got old and quietly fetches a fresh one behind the scenes.",
    available: true,
  },
  {
    id: 2,
    name: "TanStack DB",
    stack: "collections + live queries",
    gain: "Writes land instantly and roll back if the server says no.",
    blurb:
      "Keeps the data as rows you can search through locally, like a tiny database inside the page. A change shows up everywhere at once, and undoes itself if the server refuses it.",
    available: true,
  },
]
