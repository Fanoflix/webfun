import { useCallback, useState } from "react"

import { useFutureTable } from "../engine/useFutureTable"
import { flightColumns } from "./columns"
import type { Flight } from "./columns"

const ROW_COUNT = 10

const CITIES = [
  "Tokyo",
  "Reykjavik",
  "São Paulo",
  "Nairobi",
  "Osaka",
  "Zürich",
  "Dubai",
  "Lisbon",
  "Seoul",
  "Auckland",
  "Bogotá",
  "Helsinki",
]
const STATUSES = ["On time", "Boarding", "Delayed", "Departed", "Final call"]

function pick<TItem>(list: TItem[], seed: number): TItem {
  return list[seed % list.length]
}

function makeFlight(i: number): Flight {
  const n = 100 + i * 7
  return {
    id: `f${i}`,
    flight: `${pick(["AA", "BA", "LH", "QR", "NZ"], i)}-${n}`,
    destination: pick(CITIES, i),
    gate: `${pick(["A", "B", "C", "D"], i)}${(i % 20) + 1}`,
    time: `${String(6 + (i % 16)).padStart(2, "0")}:${(i * 5) % 60 < 10 ? "0" : ""}${(i * 5) % 60}`,
    status: pick(STATUSES, i),
  }
}

/** A dataset larger than one page so pagination re-projects into the same slots. */
const FULL_DATASET: Flight[] = Array.from({ length: 24 }, (_, i) => makeFlight(i))

/**
 * Owns the demo's data + current page and exposes the actions the view wires to
 * buttons. All logic lives here; `FutureTableDemo` just renders.
 */
export function useFutureTableDemo() {
  const [data, setData] = useState<Flight[]>([])
  const [pageIndex, setPageIndex] = useState(0)

  const getRowId = useCallback((row: Flight) => row.id, [])

  const table = useFutureTable<Flight>({
    columns: flightColumns,
    data,
    rowCount: ROW_COUNT,
    pageIndex,
    getRowId,
  })

  const load = useCallback(() => {
    setData(FULL_DATASET)
    setPageIndex(0)
  }, [])

  const clear = useCallback(() => {
    setData([])
    setPageIndex(0)
  }, [])

  const addRow = useCallback(() => {
    setData((d) => [...d, { ...makeFlight(d.length), id: `f${d.length}-${Date.now()}` }])
  }, [])

  // Mutate a few fields in place — the same records, new values — so you can see
  // cells flip to `updating` without any rows being added or removed.
  const updateStatuses = useCallback(() => {
    setData((d) =>
      d.map((f, i) => ({
        ...f,
        status: pick(STATUSES, i + Math.floor(Math.random() * STATUSES.length)),
        gate: `${pick(["A", "B", "C", "D"], i + 1)}${((i * 3) % 20) + 1}`,
      }))
    )
  }, [])

  const nextPage = useCallback(
    () => setPageIndex((p) => Math.min(p + 1, table.pageCount - 1)),
    [table.pageCount]
  )
  const prevPage = useCallback(() => setPageIndex((p) => Math.max(p - 1, 0)), [])

  return {
    table,
    pageIndex,
    hasData: data.length > 0,
    load,
    clear,
    addRow,
    updateStatuses,
    nextPage,
    prevPage,
  }
}
