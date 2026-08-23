import { useMemo } from "react"

import type { Flow } from "../engine/types"

export type TimelineRow = {
  id: string
  label: string
  detail?: string
  node: string
  /** Offset from the start of the flow, already formatted. */
  offset: string
}

export type Timeline = {
  title: string
  rows: TimelineRow[]
  /** Wall-clock span of the flow so far, formatted. */
  duration: string
  isEmpty: boolean
}

const formatMs = (ms: number) =>
  ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`

/**
 * Shapes one flow for display. Derived during render rather than mirrored into
 * state — the flow is already the source of truth, and a copy could only ever
 * be a chance to disagree with it.
 */
export function useTimeline(flow: Flow | null): Timeline {
  return useMemo(() => {
    if (!flow) {
      return {
        title: "Nothing yet",
        rows: [],
        duration: "—",
        isEmpty: true,
      }
    }

    const rows = flow.events.map((event) => ({
      id: event.id,
      label: event.label,
      detail: event.detail,
      node: event.node,
      offset: `+${formatMs(event.at)}`,
    }))

    const last = flow.events.at(-1)

    return {
      title: flow.label,
      rows,
      duration: last ? formatMs(last.at) : "—",
      isEmpty: rows.length === 0,
    }
  }, [flow])
}
