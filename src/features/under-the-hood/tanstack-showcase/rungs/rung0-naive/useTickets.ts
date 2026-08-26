import { useCallback, useEffect, useState } from "react"

import type { EventBus } from "../../engine/events"
import type { Server } from "../../engine/server"
import type { Ticket, TicketStatus, TicketSummary } from "../../engine/types"
import type { LoadState, TicketsView } from "../contract"

/**
 * Rung 0 — the data layer you write before you reach for a library.
 *
 * `useState` for everything, `fetch` in an effect, refetch by hand after a
 * write. This is not a strawman: it's careful naive code, including the
 * cancellation guard most people forget. It's still the version where every
 * selection costs a round-trip, because there is nowhere to keep an answer.
 *
 * The effects here are load-bearing and honest — this rung has no cache to read
 * from, so fetching *is* a side effect that has to be started by hand. Watching
 * them disappear at rung 1 is the point.
 */
export function useNaiveTickets({
  server,
  bus,
  selectedId,
}: {
  server: Server
  bus: EventBus
  selectedId: number | null
}): TicketsView {
  const [list, setList] = useState<TicketSummary[]>([])
  const [listState, setListState] = useState<LoadState>("idle")
  const [detail, setDetail] = useState<Ticket | undefined>(undefined)
  const [detailState, setDetailState] = useState<LoadState>("idle")
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /**
   * Bumped after a write to force the detail effect to run again. One mechanism
   * for "fetch the detail", used by both selection and refetch-after-write, so
   * the fetch itself isn't written twice.
   */
  const [reloadToken, setReloadToken] = useState(0)

  const loadList = useCallback(async () => {
    setListState("loading") // @beat ui:interaction
    try {
      const rows = await server.listTickets()
      setList(rows)
      setListState("ready")
    } catch {
      setListState("error")
    }
  }, [server])

  // Nothing holds the list between mounts, so it has to be asked for by hand.
  useEffect(() => {
    void loadList()
  }, [loadList])

  // And the detail is fetched on *every* selection — including re-selecting a
  // ticket that was on screen ten seconds ago. There's no cache to consult, so
  // the question has to go to the server every time.
  useEffect(() => {
    if (selectedId === null) {
      setDetail(undefined)
      setDetailState("idle")
      return
    }
    // Hand-rolled cancellation. Jitter means replies can land out of order, so
    // without this the wrong ticket shows up — and without the controller the
    // abandoned request runs to completion anyway, which is the part people
    // forget. Both are yours to remember at this rung.
    const controller = new AbortController()
    let cancelled = false
    setDetail(undefined)
    setDetailState("loading")
    server
      .getTicket(selectedId, undefined, controller.signal)
      .then((ticket) => {
        if (cancelled) return
        setDetail(ticket)
        setDetailState("ready")
      })
      .catch(() => {
        if (!cancelled) setDetailState("error")
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [selectedId, server, reloadToken])

  /**
   * Every write is followed by manual refetching, and it's on you to remember
   * everything a write touched. Forget the detail refetch and the page shows
   * stale data with no error anywhere.
   */
  const runWrite = useCallback(
    async (op: () => Promise<unknown>) => {
      setIsMutating(true)
      setError(null)
      try {
        await op()
        await loadList()
        setReloadToken((t) => t + 1)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        // Rethrown so callers can tell a completed write from a refused one —
        // `remove` needs it to decide whether the selection may move.
        throw e
      } finally {
        setIsMutating(false)
      }
    },
    [loadList]
  )

  const create = useCallback(
    (title: string, assignee: string) => {
      bus.emit("ui:interaction", "create ticket")
      void runWrite(() => server.createTicket(title, assignee)).catch(() => {})
    },
    [bus, runWrite, server]
  )

  const setStatus = useCallback(
    (id: number, status: TicketStatus) => {
      bus.emit("ui:interaction", `status → ${status}`)
      void runWrite(() => server.setStatus(id, status)).catch(() => {})
    },
    [bus, runWrite, server]
  )

  const remove = useCallback(
    async (id: number) => {
      bus.emit("ui:interaction", `delete #${id}`)
      await runWrite(() => server.deleteTicket(id))
    },
    [bus, runWrite, server]
  )

  return {
    list,
    listState,
    /**
     * Nothing. The pane waits for the whole ticket before it can draw a title.
     *
     * Not a handicap invented for the demo: the list up there is *this
     * component's* `useState`, so it is only reachable because the list and the
     * detail happen to live in one hook. Move the detail to its own route — the
     * usual shape — and there is no list in scope to read a title from, and no
     * shared place to put one. That is the gap a cache closes at rung 1: the
     * header becomes a property of the data, available to whoever asks for it,
     * rather than a prop somebody has to thread down.
     */
    summary: undefined,
    detail,
    detailState,
    isMutating,
    error,
    create,
    setStatus,
    remove,
  }
}
