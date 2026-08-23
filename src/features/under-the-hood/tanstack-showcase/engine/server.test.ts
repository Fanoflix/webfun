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
    const rows = await server.listTickets()

    // A shallow copy would share these arrays with the seed itself.
    rows[0].body.push("scribbled on")
    rows[0].comments.push({
      id: "x",
      author: "sam",
      body: "scribbled on",
      at: "now",
    })

    server.reset()
    const fresh = await server.listTickets()

    expect(fresh[0].body).not.toContain("scribbled on")
    expect(fresh[0].comments.map((c) => c.id)).not.toContain("x")
  })
})
