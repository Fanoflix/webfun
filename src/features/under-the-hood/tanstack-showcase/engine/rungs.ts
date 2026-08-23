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

export type Rung = {
  id: RungId
  name: string
  /** What the data layer is made of at this rung. */
  stack: string
  /** The sentence that says why you'd climb to it. */
  gain: string
  available: boolean
}

export const RUNGS: Rung[] = [
  {
    id: 0,
    name: "Hand-rolled",
    stack: "useState + fetch",
    gain: "Every navigation is a request. Every request is a spinner.",
    available: true,
  },
  {
    id: 1,
    name: "+ TanStack Query",
    stack: "useQuery + useMutation",
    gain: "Seen it before? It paints instantly. No request at all.",
    available: true,
  },
  {
    id: 2,
    name: "+ TanStack DB",
    stack: "collections + live queries",
    gain: "Writes land instantly and roll back if the server says no.",
    // Phase 3. Proven workable by engine/phase0-spike.test.ts.
    available: false,
  },
]
