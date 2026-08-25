import type { EventBus } from "./events"
import type { Ticket, TicketStatus } from "./types"

/**
 * The fake backend.
 *
 * The site is static on GitHub Pages, so there is no server to talk to — but the
 * point of the entry is watching a data layer deal with latency, so the latency
 * has to be real (a real `setTimeout`, real async, real in-flight time). This is
 * the only thing standing in for a network.
 *
 * `latencyMs` doubles as the demo's tempo control: turning it up genuinely slows
 * the system down for filming, rather than faking a clock and fighting the real
 * timers inside TanStack Query.
 */
export type ServerConfig = {
  latencyMs: number
  /** Random +/- spread on each response, so requests can land out of order. */
  jitterMs: number
  /** When true every write is rejected — this is how rollback gets demoed. */
  failWrites: boolean
}

export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  latencyMs: 600,
  jitterMs: 120,
  failWrites: false,
}

const SEED: Ticket[] = [
  {
    id: 1,
    title: "Login redirect loops on Safari",
    status: "open",
    assignee: "sam",
    body: [
      "Only on Safari 17. The callback bounces between /login and /auth until the tab is closed.",
      "Chrome and Firefox are unaffected. It doesn't reproduce in a private window either, which points at stored state rather than the redirect itself.",
      "Three support tickets this week, all on the same version.",
    ],
    comments: [
      {
        id: "c1",
        author: "ada",
        body: "Reproduced on 17.4 but not 16.6, so it's new. Bisecting the auth callback now.",
        at: "3d ago",
      },
      {
        id: "c2",
        author: "sam",
        body: "It's the `SameSite=Lax` cookie — Safari drops it on the redirect back, so the session looks empty and we bounce.",
        at: "2d ago",
      },
      {
        id: "c3",
        author: "kit",
        body: "Ouch. Does that mean every third-party redirect is affected, or just this one?",
        at: "2d ago",
      },
    ],
  },
  {
    id: 2,
    title: "Dark mode flickers on first paint",
    status: "in-progress",
    assignee: "ada",
    body: [
      "The theme class lands after hydration, so the page flashes light for about 80ms.",
      "Worse on a cold cache, and it happens on every route rather than just the first one.",
      "An inline script in the head would set the class before first paint.",
    ],
    comments: [
      {
        id: "c1",
        author: "kit",
        body: "Only visible on a cold load. Hard refresh a few times and you'll catch it.",
        at: "5d ago",
      },
      {
        id: "c2",
        author: "ada",
        body: "The theme class is applied after hydration. Moving it to an inline script in the head should kill it.",
        at: "4d ago",
      },
    ],
  },
  {
    id: 3,
    title: "Export CSV drops the last row",
    status: "open",
    assignee: "kit",
    body: [
      "Off-by-one in the writer. Reproducible with any export of more than one row.",
      "The header is correct and the column order is right, so it's the flush at the end rather than the mapping.",
      "Worth a regression test — this is the second time this has come back.",
    ],
    comments: [
      {
        id: "c1",
        author: "sam",
        body: "Confirmed with a 3-row export — got 2 rows.",
        at: "1d ago",
      },
      {
        id: "c2",
        author: "kit",
        body: "Classic off-by-one: the writer flushes before the last append.",
        at: "22h ago",
      },
    ],
  },
  {
    id: 4,
    title: "Search is slow past 10k rows",
    status: "done",
    assignee: "sam",
    body: [
      "Added a trigram index on title. Median query went from 1.9s to 40ms.",
      "The p99 is still around 300ms on the largest workspaces, which we can live with for now.",
      "Closing this. Reopen if anyone hits the tail case.",
    ],
    comments: [
      {
        id: "c1",
        author: "sam",
        body: "Added a trigram index on title. p50 went 1.9s to 40ms, p99 still 300ms.",
        at: "1w ago",
      },
      {
        id: "c2",
        author: "ada",
        body: "Good enough to close. We can revisit p99 if anyone complains.",
        at: "6d ago",
      },
    ],
  },
  {
    id: 5,
    title: "Avatar upload rejects PNGs",
    status: "open",
    assignee: "ada",
    body: [
      "The mime allowlist checks for image/jpeg only, so PNG and WebP both bounce.",
      "The toast just says 'unsupported file' without naming which formats are allowed, so people retry the same file.",
    ],
    comments: [
      {
        id: "c1",
        author: "ada",
        body: "The allowlist only has image/jpeg. PNG and WebP both bounce.",
        at: "4h ago",
      },
    ],
  },
]

export type Server = ReturnType<typeof createServer>

export function createServer(bus: EventBus, config: ServerConfig) {
  /**
   * A fresh copy of the seed, deep enough that nothing downstream can reach back
   * and mutate the template. A shallow copy would share the `body` and
   * `comments` arrays with `SEED`, so one careless in-place edit would corrupt
   * every later reset — including the ones that are supposed to make the rungs
   * comparable.
   */
  const seedRows = (): Ticket[] =>
    SEED.map((ticket) => ({
      ...ticket,
      body: [...ticket.body],
      comments: ticket.comments.map((comment) => ({ ...comment })),
    }))

  let rows: Ticket[] = seedRows()
  let nextId = SEED.length + 1
  // Held in a mutable box so the controls can retune latency mid-flight without
  // rebuilding the server and losing the rows already in it.
  let current = { ...config }

  /**
   * The wait, interruptible.
   *
   * A real request can be called off while it's in flight, and a demo that
   * can't do that leaves rows sitting on "pending" long after the reader has
   * moved on — which is exactly what a real network tab would *not* show.
   */
  const delay = (signal?: AbortSignal) => {
    const spread = (Math.random() * 2 - 1) * current.jitterMs
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"))
        return
      }
      const timer = setTimeout(resolve, Math.max(0, current.latencyMs + spread))
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer)
          reject(new DOMException("Aborted", "AbortError"))
        },
        { once: true }
      )
    })
  }

  /**
   * Every endpoint has the same shape: receive, wait, then respond or reject.
   *
   * `trace` is whatever the caller is doing this on behalf of — a query key at
   * rung 1, the endpoint itself at rung 0. It rides along on the events so the
   * timeline can pair a response with its request and nest cache writes under
   * it, the way a real system tags requests with a trace id.
   */
  async function handle<T>(
    what: string,
    trace: string,
    produce: () => T,
    isWrite = false,
    signal?: AbortSignal
  ) {
    bus.emit("server:receive", what, trace)
    try {
      await delay(signal)
    } catch (error) {
      bus.emit("server:cancelled", what, trace)
      throw error
    }
    if (isWrite && current.failWrites) {
      bus.emit("server:reject", what, trace)
      throw new Error(`Server rejected: ${what}`)
    }
    const result = produce()
    bus.emit("server:respond", what, trace)
    return result
  }

  return {
    setConfig(next: Partial<ServerConfig>) {
      current = { ...current, ...next }
    },

    /**
     * Put the data back exactly as it started.
     *
     * Called when the rung changes. Without it the server keeps whatever the
     * previous rung did to it — a deleted ticket, a status you flipped — and the
     * next rung starts from different data. Comparing two rungs is the entire
     * point of the entry, and a comparison only means something if both sides
     * begin from the same place.
     */
    reset() {
      rows = seedRows()
      nextId = SEED.length + 1
    },

    listTickets: (trace = "GET /tickets", signal?: AbortSignal) =>
      handle(
        "GET /tickets",
        trace,
        () => rows.map((t) => ({ ...t })),
        false,
        signal
      ),

    getTicket: (
      id: number,
      trace = `GET /tickets/${id}`,
      signal?: AbortSignal
    ) =>
      handle(
        `GET /tickets/${id}`,
        trace,
        () => {
          const found = rows.find((t) => t.id === id)
          if (!found) throw new Error(`No ticket ${id}`)
          return { ...found }
        },
        false,
        signal
      ),

    createTicket: (title: string, assignee: string, trace = "POST /tickets") =>
      handle(
        "POST /tickets",
        trace,
        () => {
          const created: Ticket = {
            id: nextId++,
            title,
            status: "open",
            assignee,
            body: ["Filed from the composer."],
            comments: [],
          }
          rows = [created, ...rows]
          return { ...created }
        },
        true
      ),

    setStatus: (
      id: number,
      status: TicketStatus,
      trace = `PATCH /tickets/${id}`
    ) =>
      handle(
        `PATCH /tickets/${id}`,
        trace,
        () => {
          rows = rows.map((t) => (t.id === id ? { ...t, status } : t))
          const updated = rows.find((t) => t.id === id)!
          return { ...updated }
        },
        true
      ),

    deleteTicket: (id: number, trace = `DELETE /tickets/${id}`) =>
      handle(
        `DELETE /tickets/${id}`,
        trace,
        () => {
          rows = rows.filter((t) => t.id !== id)
        },
        true
      ),
  }
}
