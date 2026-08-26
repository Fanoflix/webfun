import { createCollection } from "@tanstack/db"
import { queryCollectionOptions } from "@tanstack/query-db-collection"
import type { QueryClient } from "@tanstack/react-query"

import type { EventBus } from "../../engine/events"
import type { Server } from "../../engine/server"
import type { TicketSummary } from "../../engine/types"

/** The one query the collection is fed from. */
export const TICKETS_KEY = ["tickets", "collection"] as const
const TRACE = JSON.stringify(TICKETS_KEY)

/**
 * The ticket collection: TanStack DB layered on top of the Query from rung 1.
 *
 * This is the path a Query user would actually take. Query keeps doing what
 * it's good at — fetching, retrying, deciding when data is old — and DB adds a
 * store of normalised rows on top, which is what makes local queries and
 * optimistic writes possible. Rung 2 doesn't replace rung 1's work; it stands
 * on it. (An Electric-backed collection would swap out only the sync source.)
 *
 * The collection holds *summaries*, because that is what the list endpoint
 * sends. A collection is only ever as complete as the thing feeding it — so a
 * ticket's body is still a request here, and pretending otherwise would be a
 * property of our fake server rather than of TanStack DB.
 *
 * The `onInsert` / `onUpdate` / `onDelete` handlers are the write path. DB
 * applies the change locally *first*, calls the handler, and — this is the part
 * worth watching — undoes the local change by itself if the handler throws. No
 * snapshot bookkeeping, no list of caches to patch back.
 */
export function createTicketCollection({
  queryClient,
  server,
  bus,
}: {
  queryClient: QueryClient
  server: Server
  bus: EventBus
}) {
  /** Wraps a write so the sync round-trip is narrated the same way each time. */
  const push = async (what: string, send: () => Promise<unknown>) => {
    bus.emit("sync:push", what, TRACE)
    try {
      await send()
      bus.emit("sync:ack", what, TRACE)
    } catch (error) {
      // DB rolls the optimistic row back on a rejected handler; this only
      // reports it, so the timeline shows the undo rather than inferring it.
      bus.emit("db:optimistic:rollback", what, TRACE)
      throw error
    }
  }

  return createCollection(
    queryCollectionOptions<TicketSummary>({
      queryClient,
      queryKey: TICKETS_KEY,
      queryFn: () => server.listTickets(TRACE),
      getKey: (ticket) => ticket.id,

      onInsert: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const ticket = mutation.modified
          await push(`insert #${ticket.id}`, () =>
            server.createTicket(ticket.title, ticket.assignee, TRACE)
          )
        }
      },

      onUpdate: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const ticket = mutation.modified
          await push(`update #${ticket.id}`, () =>
            server.setStatus(ticket.id, ticket.status, TRACE)
          )
        }
      },

      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const id = mutation.key as number
          await push(`delete #${id}`, () => server.deleteTicket(id, TRACE))
        }
      },
    })
  )
}

export type TicketCollection = ReturnType<typeof createTicketCollection>
