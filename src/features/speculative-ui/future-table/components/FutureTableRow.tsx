import type { RenderRow } from "../engine/types"
import { FutureTableCell } from "./FutureTableCell"

/**
 * One fixed slot. Never mounts/unmounts across data changes (keyed by slot index
 * upstream); only its cells' contents change. Cell-level memoization does the
 * heavy lifting, so the row itself stays a thin map.
 */
export function FutureTableRow({ row }: { row: RenderRow }) {
  return (
    <tr data-empty={row.isEmpty} className="border-b border-border/40">
      {row.getCells().map((cell) => (
        <FutureTableCell key={cell.id} cell={cell} />
      ))}
    </tr>
  )
}
