import { describe, expect, it } from "vitest"

import { createEventBus } from "./events"
import { DEFAULT_SERVER_CONFIG, createServer } from "./server"

/** No latency: these tests are about data, not timing. */
const instant = { ...DEFAULT_SERVER_CONFIG, latencyMs: 0, jitterMs: 0 }

function makeServer() {
  const bus = createEventBus()
  bus.beginFlow("test")
  return createServer(bus, instant)
}

describe("the fake server's starting state", () => {
  it("is identical on every reset", async () => {
    const server = makeServer()
    const before = await server.listTickets()

    await server.setStatus(1, "done")
    await server.deleteTicket(2)
    await server.createTicket("Something new", "sam")
    expect(await server.listTickets()).not.toEqual(before)

    server.reset()

    // Same tickets, same statuses, same order — what changes between rungs has
    // to be the data layer and nothing else.
    expect(await server.listTickets()).toEqual(before)
  })

  it("hands back the same ids after a reset, so new tickets don't drift", async () => {
    const server = makeServer()
    const first = await server.createTicket("One", "sam")

    server.reset()
    const again = await server.createTicket("One", "sam")

    expect(again.id).toBe(first.id)
  })

  it("never lets a caller mutate the template behind the seed", async () => {
    const server = makeServer()
    const ticket = await server.getTicket(1)

    // A shallow copy would share these arrays with the seed itself.
    ticket.body.push("scribbled on")
    ticket.comments.push({
      id: "x",
      author: "sam",
      body: "scribbled on",
      at: "now",
    })

    server.reset()
    const fresh = await server.getTicket(1)

    expect(fresh.body).not.toContain("scribbled on")
    expect(fresh.comments.map((c) => c.id)).not.toContain("x")
  })

  /**
   * The list is a list of summaries, and this is the assertion that keeps it
   * one. Sending bodies here would cost nothing visible and quietly make every
   * detail request in the demo redundant — which is precisely the dishonesty
   * the split exists to remove.
   */
  it("sends summaries from the list, not bodies", async () => {
    const server = makeServer()
    const rows = await server.listTickets()

    for (const row of rows) {
      expect(row).not.toHaveProperty("body")
      expect(row).not.toHaveProperty("comments")
      expect(row.preview.length).toBeGreaterThan(0)
    }
  })

  it("cuts the preview from the first line of the body", async () => {
    const server = makeServer()
    const [row] = await server.listTickets()
    const full = await server.getTicket(row.id)

    expect(row.preview).toBe(full.body[0])
  })
})
