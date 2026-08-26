import { useCallback, useEffect, useRef, useState } from "react"

import { useSidebar } from "@/components/ui/sidebar"

import { createEventBus } from "../engine/events"
import { createServer, DEFAULT_SERVER_CONFIG } from "../engine/server"
import type { ServerConfig } from "../engine/server"
import type { RungId } from "../engine/rungs"
import { RUNGS, RUNG_SWITCH_MS } from "../engine/rungs"
import { useEventStream } from "../engine/useEventStream"
import { useTimeline } from "../timeline/useTimeline"
import { useArchitecture } from "../architecture/useArchitecture"
import { neighbourOf } from "./selection"
import type { TicketsView } from "../rungs/contract"

/**
 * Which instrument is in the right-hand panel.
 *
 * Not "which view of the app" — the app is always on the left. Every name here
 * is a way of watching it, which is why there's no "app" option: that would
 * suggest the product is one of three things on offer rather than the constant.
 */
export type Mode = "network" | "architecture"

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
    created.beginFlow("First load", "system")
    return created
  })
  const [server] = useState(() => createServer(bus, DEFAULT_SERVER_CONFIG))

  const [serverConfig, setServerConfigState] = useState<ServerConfig>(
    DEFAULT_SERVER_CONFIG
  )
  const [rung, setRungState] = useState<RungId>(0)
  /**
   * The rung being switched *to* while the reset animation runs, or null.
   *
   * The swap is deliberately deferred rather than instant: changing rung
   * rebuilds the whole data layer, and the incoming one must not mount until the
   * animation is over, or its first fetch happens behind the blur where nobody
   * can see it — which is the one thing worth watching.
   */
  const [pendingRung, setPendingRung] = useState<RungId | null>(null)
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mode, setMode] = useState<Mode>("network")
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const flows = useEventStream(bus)
  const timeline = useTimeline(flows, rung)
  const architecture = useArchitecture(flows, rung)

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

  /**
   * Go back to the inbox.
   *
   * Only reachable on a narrow screen, where the list and the detail take turns
   * instead of sitting side by side — without it there'd be no way back to the
   * list once a ticket was open.
   */
  const deselect = useCallback(() => setSelectedId(null), [])

  const setRung = useCallback(
    (next: RungId) => {
      // A re-click on what's already running is a no-op, but a click during a
      // switch retargets it rather than being swallowed: dropping it left the
      // ladder showing one rung while another was still on its way, which read
      // as the whole control being unresponsive.
      if (next === (pendingRung ?? rung)) return
      // Only one timer may be in flight — a leftover would swap in a rung the
      // ladder has already moved past.
      if (switchTimer.current) clearTimeout(switchTimer.current)
      setPendingRung(next)
      switchTimer.current = setTimeout(() => {
        setRungState(next)
        setSelectedId(null)
        // Same tickets, same statuses, every time — so what changes between
        // rungs is the data layer and nothing else.
        server.reset()
        // A different data layer's numbers aren't comparable with the last
        // one's, so the log starts empty rather than mixing the two.
        bus.clear()
        // Not "switched to X": what the reader sees next is the new data layer
        // loading from cold, and that's what the segment should say. The switch
        // itself isn't something the app did, so it isn't worth a line.
        bus.beginFlow("First load", "system")
        setPendingRung(null)
      }, RUNG_SWITCH_MS)
    },
    [bus, rung, pendingRung, server]
  )

  // Cleanup only: a pending switch must not fire into an unmounted component.
  useEffect(
    () => () => {
      if (switchTimer.current) clearTimeout(switchTimer.current)
    },
    []
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
      remove: async (id) => {
        bus.beginFlow(`Delete #${id}`)
        // Work out the neighbour *now*, while the row is still in the list and
        // its position is known — but don't act on it yet.
        const next = neighbourOf(view.list, id)
        try {
          await view.remove(id)
          // Only once the server has agreed. Moving on the click would strand
          // the reader on a different ticket after a delete that was refused.
          if (id === selectedId) setSelectedId(next)
        } catch {
          // The row is still there and still selected. The error surfaces
          // through the view's own `error`, so there's nothing to add here.
        }
      },
    }),
    [bus, selectedId]
  )

  return {
    bus,
    server,
    serverConfig,
    updateServerConfig,
    rung,
    setRung,
    /** What the ladder should highlight: the target as soon as it's clicked. */
    displayRung: pendingRung ?? rung,
    switchingTo: pendingRung === null ? null : RUNGS[pendingRung].name,
    mode,
    setMode,
    selectedId,
    select,
    deselect,
    timeline,
    architecture,
    clearLog: () => bus.clear(),
    railOffset,
    latestEvent: flows.at(-1)?.events.at(-1),
    attachFlows,
  }
}
