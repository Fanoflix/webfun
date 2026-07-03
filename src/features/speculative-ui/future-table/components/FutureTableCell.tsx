import { memo } from "react"

import type { RenderCell } from "../engine/types"

/**
 * One cell. Renders the filled content, or the column's styled empty placeholder
 * while the slot has no data. `data-phase` exposes the transition phase for CSS /
 * a Framer layer to hook into during the aesthetics pass — the value flip is not
 * animated yet.
 */
function FutureTableCellImpl({ cell }: { cell: RenderCell }) {
  return (
    <td
      data-phase={cell.phase}
      data-empty={cell.isEmpty}
      style={cell.size ? { width: cell.size } : undefined}
      className="px-3 py-2 text-sm"
    >
      {cell.isEmpty ? (
        <span className={cell.getEmptyClassName()}>
          {cell.emptyState.fillString}
        </span>
      ) : (
        cell.render()
      )}
    </td>
  )
}

/**
 * Skip re-render unless something the cell actually shows changed. Cell objects
 * are rebuilt on every data change, so a shallow reference check wouldn't help —
 * we compare the display-relevant fields instead.
 */
export const FutureTableCell = memo(
  FutureTableCellImpl,
  (a, b) =>
    a.cell.isEmpty === b.cell.isEmpty &&
    a.cell.phase === b.cell.phase &&
    a.cell.size === b.cell.size &&
    Object.is(a.cell.value, b.cell.value)
)
