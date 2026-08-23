import { useCallback, useState } from "react"

import { useSidebar } from "@/components/ui/sidebar"

import { createEventBus } from "../engine/events"
import { createServer, DEFAULT_SERVER_CONFIG } from "../engine/server"
import type { ServerConfig } from "../engine/server"
import type { RungId } from "../engine/rungs"
import { RUNGS } from "../engine/rungs"
import { useEventStream } from "../engine/useEventStream"
import { useTimeline } from "../timeline/useTimeline"
import type { TicketsView } from "../rungs/contract"

/** Architecture and Code arrive in later phases; the toggle already knows them. */
export type Mode = "app" | "architecture" | "code"

/**
 * Everything the showcase page owns: which rung is running, how slow the fake
 * network is, what's selected, and the event bus the whole thing narrates
 * itself through.
 *
 * Note what is *not* here: the ticket data. That belongs to whichever rung is
 * mounted, which is the entire point — swapping the data layer has to be a real
 * swap, not a branch inside one shared store.
 */
export function useTanstackShowcase() {
  const [bus] = useState(() => {
    const created = createEventBus()
    // Open a flow immediately so the very first load has somewhere to land —
    // otherwise the app's own boot sequence is dropped as unattributed noise.
    created.beginFlow("First load")
    return created
  })
  const [server] = useState(() => createServer(bus, DEFAULT_SERVER_CONFIG))

  const [serverConfig, setServerConfigState] = useState<ServerConfig>(
    DEFAULT_SERVER_CONFIG
  )
  const [rung, setRungState] = useState<RungId>(0)
  const [mode, setMode] = useState<Mode>("app")
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const flow = useEventStream(bus)
  const timeline = useTimeline(flow)

  /**
   * The site's sidebar *floats over* content rather than pushing it (the shared
   * layout zeroes the reserved gap on purpose). Every other tool is centred and
   * narrow, so it never notices. This page is full-bleed, so it has to reserve
   * the rail's track itself or the app window hides underneath it.
   */
  const { state, isMobile } = useSidebar()
  const railOffset = !isMobile && state === "expanded"

  const select = useCallback(
    (id: number) => {
      // Re-clicking the ticket that's already open changes nothing, so it must
      // not wipe the timeline — the flow that's showing is still the one that
      // explains what's on screen.
      if (id === selectedId) return
      bus.beginFlow(`Open ticket #${id}`)
      bus.emit("ui:interaction", `selected #${id}`)
      setSelectedId(id)
    },
    [bus, selectedId]
  )

  const setRung = useCallback(
    (next: RungId) => {
      setRungState(next)
      setSelectedId(null)
      bus.beginFlow(`Switched to ${RUNGS[next].name}`)
    },
    [bus]
  )

  /**
   * The server is a plain object rather than React state, so retuning it is a
   * direct call. Mirroring the values into state as well is only so the sliders
   * have something to render.
   */
  const updateServerConfig = useCallback(
    (patch: Partial<ServerConfig>) => {
      server.setConfig(patch)
      setServerConfigState((current) => ({ ...current, ...patch }))
    },
    [server]
  )

  /**
   * Wraps a rung's write methods so each one opens a flow before it runs.
   *
   * Doing it here keeps the rungs ignorant of flows — they emit what they do,
   * and the page decides what counts as a user interaction worth resetting the
   * timeline for.
   */
  const attachFlows = useCallback(
    (view: TicketsView): TicketsView => ({
      ...view,
      create: (title, assignee) => {
        bus.beginFlow(`Add "${title}"`)
        view.create(title, assignee)
      },
      setStatus: (id, status) => {
        bus.beginFlow(`Set #${id} → ${status}`)
        view.setStatus(id, status)
      },
      remove: (id) => {
        bus.beginFlow(`Delete #${id}`)
        view.remove(id)
      },
    }),
    [bus]
  )

  return {
    bus,
    server,
    serverConfig,
    updateServerConfig,
    rung,
    setRung,
    mode,
    setMode,
    selectedId,
    select,
    flow,
    timeline,
    railOffset,
    latestEvent: flow?.events.at(-1),
    attachFlows,
  }
}
