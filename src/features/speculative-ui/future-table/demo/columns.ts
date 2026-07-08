import type { ColumnDef } from "../engine/types"

export type Flight = {
  id: string
  flight: string
  destination: string
  gate: string
  time: string
  status: string
}

/**
 * Demo columns. Each declares its empty-state "shape" via the `empty` object —
 * this is what shows in a slot before any data lands (e.g. "XX-000" in mono).
 */
export const flightColumns: ColumnDef<Flight>[] = [
  {
    accessorKey: "flight",
    header: "Flight",
    size: 110,
    empty: { fillString: "XX-000", fillFontType: "mono" },
  },
  {
    accessorKey: "destination",
    header: "Destination",
    size: 220,
    empty: { fillString: "xxxxxxxxx" },
  },
  {
    accessorKey: "gate",
    header: "Gate",
    size: 80,
    empty: { fillString: "xx", fillFontType: "mono" },
  },
  {
    accessorKey: "time",
    header: "Time",
    size: 100,
    empty: { fillString: "xx:xx", fillFontType: "mono" },
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 150,
    empty: { fillString: "———" },
  },
]
