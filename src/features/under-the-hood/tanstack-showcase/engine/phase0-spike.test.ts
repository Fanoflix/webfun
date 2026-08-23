/**
 * Phase 0 gate for the TanStack showcase.
 *
 * The open question was whether TanStack DB is usable without ElectricSQL. It is:
 * Electric ships as a *separate* adapter package, and the core `SyncConfig`
 * interface is public, so any source can back a collection. We take the path a
 * Query user would actually take — `queryCollectionOptions`, which layers DB on
 * top of a normal Query — because that's exactly rung 2 of the ladder: keep
 * rung 1's work, add the reactive store above it.
 *
 * This proves the three behaviours the entry is built on. If any break on a
 * future `0.x` bump, the entry's rung 2 is what needs revisiting.
 */
import { describe, expect, it } from "vitest"
import { QueryClient } from "@tanstack/react-query"
import { createCollection, createLiveQueryCollection, eq } from "@tanstack/db"
import { queryCollectionOptions } from "@tanstack/query-db-collection"

type Ticket = { id: number; title: string; status: "open" | "done" }

/** Stand-in for the entry's fake server: latency and a failure switch. */
function makeServer(initial: Ticket[]) {
  let rows = [...initial]
  return {
    failWrites: false,
    async list(): Promise<Ticket[]> {
      await new Promise((r) => setTimeout(r, 1))
      return rows.map((r) => ({ ...r }))
    },
    async insert(t: Ticket) {
      await new Promise((r) => setTimeout(r, 1))
      if (this.failWrites) throw new Error("server rejected the write")
      rows = [...rows, t]
    },
  }
}

function makeCollection(server: ReturnType<typeof makeServer>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const collection = createCollection(
    queryCollectionOptions<Ticket>({
      queryClient,
      queryKey: ["tickets"],
      queryFn: () => server.list(),
      getKey: (t) => t.id,
      onInsert: async ({ transaction }) => {
        for (const m of transaction.mutations) {
          await server.insert(m.modified)
        }
      },
    })
  )
  return { queryClient, collection }
}

describe("phase 0 — TanStack DB without Electric", () => {
  it("syncs a collection from a Query-backed source", async () => {
    const server = makeServer([
      { id: 1, title: "Login is broken", status: "open" },
      { id: 2, title: "Dark mode flicker", status: "done" },
    ])
    const { collection } = makeCollection(server)

    await collection.preload()

    expect(collection.size).toBe(2)
    expect(collection.get(1)?.title).toBe("Login is broken")
  })

  it("runs a live query that updates without a refetch", async () => {
    const server = makeServer([
      { id: 1, title: "Login is broken", status: "open" },
      { id: 2, title: "Dark mode flicker", status: "done" },
    ])
    const { collection } = makeCollection(server)
    await collection.preload()

    // The thing Query alone cannot express: a derived view, computed locally,
    // shared by every consumer, recomputed incrementally on change.
    const openTickets = createLiveQueryCollection({
      query: (q) =>
        q.from({ t: collection }).where(({ t }) => eq(t.status, "open")),
    })
    await openTickets.preload()

    expect(openTickets.size).toBe(1)

    // A write to the *base* collection must flow into the derived query with no
    // network round-trip and no invalidation.
    collection.insert({ id: 3, title: "Search is slow", status: "open" })

    expect(openTickets.size).toBe(2)
  })

  it("applies an optimistic write instantly, then rolls it back when the server rejects", async () => {
    const server = makeServer([
      { id: 1, title: "Login is broken", status: "open" },
    ])
    const { collection } = makeCollection(server)
    await collection.preload()

    server.failWrites = true

    const tx = collection.insert({ id: 99, title: "Doomed", status: "open" })

    // Optimistic: visible before the server has been asked.
    expect(collection.has(99)).toBe(true)

    await expect(tx.isPersisted.promise).rejects.toThrow()

    // Rolled back automatically — no snapshot bookkeeping written by us.
    expect(collection.has(99)).toBe(false)
    expect(collection.size).toBe(1)
  })
})
