import { memo } from "react"

import { cn } from "@/lib/utils"
import { CharacterFlow } from "@/features/motion/character-flow/CharacterFlow"
import type { RenderCell } from "../engine/types"

/**
 * One cell. When the display resolves to a plain string — the column's empty
 * placeholder while the slot is unfilled, or `String(value)` once data lands —
 * it flows through `CharacterFlow`, so filling / clearing / updating a slot
 * animates as a split-flap roll: shared characters slide, the rest scroll in and
 * out. Custom (non-string) cell renderers fall back to rendering as-is.
 * `data-phase` still exposes the engine's transition phase for CSS hooks.
 */
function FutureTableCellImpl({ cell }: { cell: RenderCell }) {
  const content = cell.isEmpty ? cell.emptyState.fillString : cell.render()

  return (
    <td
      data-phase={cell.phase}
      data-empty={cell.isEmpty}
      style={cell.size ? { width: cell.size } : undefined}
      className="px-3 py-2 text-sm"
    >
      {typeof content === "string" ? (
        <CharacterFlow
          value={content}
          className={cn(
            "tabular-nums",
            cell.isEmpty && cell.getEmptyClassName()
          )}
          duration={0.3}
          stagger={0}
          exit={{ duration: 0 }}
          rollDistance={0.2}
          trend="down"
        />
      ) : (
        content
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
