import { useCallback, useEffect, useRef, useState } from "react"

import { useSidebar } from "@/components/ui/sidebar"

import { createEventBus } from "../engine/events"
import { createServer, DEFAULT_SERVER_CONFIG } from "../engine/server"
import type { ServerConfig } from "../engine/server"
import type { RungId } from "../engine/rungs"
import { RUNGS, RUNG_SWITCH_MS } from "../engine/rungs"
import { useEventStream } from "../engine/useEventStream"
import { useTimeline } from "../timeline/useTimeline"
import { neighbourOf } from "./selection"
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
  const [mode, setMode] = useState<Mode>("app")
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const flows = useEventStream(bus)
  const timeline = useTimeline(flows, rung)

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
      // Ignore a re-click on the current rung, and anything during a switch —
      // two overlapping resets would leave a stray timer holding the old rung.
      if (next === rung || pendingRung !== null) return
      setPendingRung(next)
      switchTimer.current = setTimeout(() => {
        setRungState(next)
        setSelectedId(null)
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
    [bus, rung, pendingRung]
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
    timeline,
    clearLog: () => bus.clear(),
    railOffset,
    latestEvent: flows.at(-1)?.events.at(-1),
    attachFlows,
  }
}
