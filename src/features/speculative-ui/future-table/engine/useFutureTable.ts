import { useEffect, useMemo, useRef } from "react"

import { buildFutureTable } from "./core"
import type { SlotSnapshot } from "./core"
import type { FutureTableInstance, FutureTableOptions } from "./types"

/**
 * The future-table equivalent of `useReactTable`. Pagination is controlled: the
 * caller owns `pageIndex` and passes it in, exactly like TanStack's controlled
 * state. All row/cell view-model + animation-phase logic lives here and in
 * `core.ts`; components stay dumb.
 *
 * Phase is derived by diffing each render against the previously committed one,
 * so the snapshot is stored in an effect (after commit) and read during render.
 * Memoize `columns` (and `getRowId`) at the call site so the instance is only
 * rebuilt when data/page actually changes — same discipline as TanStack.
 */
export function useFutureTable<T>(
  options: FutureTableOptions<T>
): FutureTableInstance<T> {
  const { columns, data, rowCount, getRowId, defaultEmpty } = options
  const pageIndex = options.pageIndex ?? 0

  const prevRef = useRef<SlotSnapshot>(new Map())

  const { instance, next } = useMemo(
    () =>
      buildFutureTable(
        { columns, data, rowCount, pageIndex, getRowId, defaultEmpty },
        prevRef.current
      ),
    [columns, data, rowCount, pageIndex, getRowId, defaultEmpty]
  )

  useEffect(() => {
    prevRef.current = next
  }, [next])

  return instance
}
