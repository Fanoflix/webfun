import type { ReactNode } from "react"
import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import type { EventBus } from "../engine/events"
import type { Server } from "../engine/server"
import type { RungId } from "../engine/rungs"
import type { TicketsView } from "./contract"
import { createTicketCollection } from "./rung2-db/collection"
import { useDbTickets } from "./rung2-db/useTickets"
import { useNaiveTickets } from "./rung0-naive/useTickets"
import { useQueryInstrumentation } from "./rung1-query/useQueryInstrumentation"
import { useQueryTickets } from "./rung1-query/useTickets"

type HostProps = {
  server: Server
  bus: EventBus
  selectedId: number | null
  children: (view: TicketsView) => ReactNode
}

/**
 * Picks the rung's implementation and hands its view to the app.
 *
 * A render prop rather than a hook, because each rung is a *different* hook and
 * hooks can't be called conditionally. Rendering a different component per rung
 * also means React unmounts the old one on a switch — so changing rung genuinely
 * starts the data layer over, with no cache surviving from the rung before. That
 * reset is the honest behaviour: a rung-1 cache leaking into rung 0 would make
 * rung 0 look better than it is.
 */
export function RungHost({ rung, ...props }: HostProps & { rung: RungId }) {
  if (rung === 2) return <Rung2Host {...props} />
  if (rung === 1) return <Rung1Host {...props} />
  return <Rung0Host {...props} />
}

function Rung0Host({ server, bus, selectedId, children }: HostProps) {
  const view = useNaiveTickets({ server, bus, selectedId })
  return <>{children(view)}</>
}

function Rung1Host(props: HostProps) {
  // One client per mount, so a rung switch really does start from cold.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Retries would quietly paper over the fail-writes switch, and the
          // whole point of that switch is to make failure visible.
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
  )
  return (
    <QueryClientProvider client={queryClient}>
      <Rung1Inner {...props} />
    </QueryClientProvider>
  )
}

function Rung1Inner({ server, bus, selectedId, children }: HostProps) {
  useQueryInstrumentation(bus)
  const view = useQueryTickets({ server, bus, selectedId })
  return <>{children(view)}</>
}

/**
 * Rung 2 keeps rung 1's Query client — the collection is fed *by* a query — and
 * adds the collection on top. Both are built once per mount so a rung switch
 * still starts from cold.
 */
function Rung2Host({ server, bus, selectedId, children }: HostProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
  )
  const [collection] = useState(() =>
    createTicketCollection({ queryClient, server, bus })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <Rung2Inner collection={collection} bus={bus} selectedId={selectedId}>
        {children}
      </Rung2Inner>
    </QueryClientProvider>
  )
}

function Rung2Inner({
  collection,
  bus,
  selectedId,
  children,
}: {
  collection: ReturnType<typeof createTicketCollection>
  bus: EventBus
  selectedId: number | null
  children: (view: TicketsView) => ReactNode
}) {
  useQueryInstrumentation(bus)
  const view = useDbTickets({ collection, bus, selectedId })
  return <>{children(view)}</>
}
