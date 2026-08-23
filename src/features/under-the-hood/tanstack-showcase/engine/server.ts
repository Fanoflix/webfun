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
  },
  {
    id: 2,
    title: "Dark mode flickers on first paint",
    status: "in-progress",
    assignee: "ada",
  },
  {
    id: 3,
    title: "Export CSV drops the last row",
    status: "open",
    assignee: "kit",
  },
  {
    id: 4,
    title: "Search is slow past 10k rows",
    status: "done",
    assignee: "sam",
  },
  {
    id: 5,
    title: "Avatar upload rejects PNGs",
    status: "open",
    assignee: "ada",
  },
]

export type Server = ReturnType<typeof createServer>

export function createServer(bus: EventBus, config: ServerConfig) {
  let rows: Ticket[] = SEED.map((t) => ({ ...t }))
  let nextId = SEED.length + 1
  // Held in a mutable box so the controls can retune latency mid-flight without
  // rebuilding the server and losing the rows already in it.
  let current = { ...config }

  const delay = () => {
    const spread = (Math.random() * 2 - 1) * current.jitterMs
    return new Promise<void>((resolve) =>
      setTimeout(resolve, Math.max(0, current.latencyMs + spread))
    )
  }

  /** Every endpoint has the same shape: receive, wait, then respond or reject. */
  async function handle<T>(what: string, produce: () => T, isWrite = false) {
    bus.emit("server:receive", what)
    await delay()
    if (isWrite && current.failWrites) {
      bus.emit("server:reject", what)
      throw new Error(`Server rejected: ${what}`)
    }
    const result = produce()
    bus.emit("server:respond", what)
    return result
  }

  return {
    setConfig(next: Partial<ServerConfig>) {
      current = { ...current, ...next }
    },

    listTickets: () =>
      handle("GET /tickets", () => rows.map((t) => ({ ...t }))),

    getTicket: (id: number) =>
      handle(`GET /tickets/${id}`, () => {
        const found = rows.find((t) => t.id === id)
        if (!found) throw new Error(`No ticket ${id}`)
        return { ...found }
      }),

    createTicket: (title: string, assignee: string) =>
      handle(
        "POST /tickets",
        () => {
          const created: Ticket = {
            id: nextId++,
            title,
            status: "open",
            assignee,
          }
          rows = [created, ...rows]
          return { ...created }
        },
        true
      ),

    setStatus: (id: number, status: TicketStatus) =>
      handle(
        `PATCH /tickets/${id}`,
        () => {
          rows = rows.map((t) => (t.id === id ? { ...t, status } : t))
          const updated = rows.find((t) => t.id === id)!
          return { ...updated }
        },
        true
      ),

    deleteTicket: (id: number) =>
      handle(
        `DELETE /tickets/${id}`,
        () => {
          rows = rows.filter((t) => t.id !== id)
        },
        true
      ),
  }
}
