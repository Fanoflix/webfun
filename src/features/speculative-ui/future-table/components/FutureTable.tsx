import type { FutureTableInstance } from "../engine/types"
import { FutureTableRow } from "./FutureTableRow"

/**
 * Default presentational shell for a future-table instance. Headless-ish: it
 * just walks the instance (header cells + the fixed row slots). Styling is
 * intentionally minimal for now — the aesthetics pass owns the real look and the
 * Framer value-flip animation.
 */
export function FutureTable<T>({ table }: { table: FutureTableInstance<T> }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-border">
          {table.getHeaderCells().map((header) => (
            <th
              key={header.columnId}
              style={header.size ? { width: header.size } : undefined}
              className="px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              {header.render()}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.getRows().map((row) => (
          <FutureTableRow key={row.index} row={row} />
        ))}
      </tbody>
    </table>
  )
}
