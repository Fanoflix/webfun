import { getEmptyClassName, resolveEmptyState } from "./defaults"
import type {
  CellPhase,
  ColumnDef,
  FutureCell,
  FutureRow,
  FutureTableInstance,
  FutureTableOptions,
  HeaderCell,
} from "./types"

/** What a cell showed on the previous render, keyed by cell id. */
export type CellSnapshot = { value: unknown; isEmpty: boolean; rowId: string | undefined }
export type SlotSnapshot = Map<string, CellSnapshot>

function columnId<T>(column: ColumnDef<T>, index: number): string {
  return column.id ?? column.accessorKey ?? `col_${index}`
}

function resolveValue<T>(column: ColumnDef<T>, row: T): unknown {
  if (column.accessorFn) return column.accessorFn(row)
  if (column.accessorKey)
    return (row as Record<string, unknown>)[column.accessorKey]
  return undefined
}

function defaultGetRowId<T>(row: T, index: number): string {
  const id = (row as Record<string, unknown> | undefined)?.id
  return id == null ? String(index) : String(id)
}

/** Compare a slot's current state to its previous one to get the animation phase. */
function diffPhase(
  prev: CellSnapshot | undefined,
  isEmpty: boolean,
  value: unknown,
  rowId: string | undefined
): CellPhase {
  // No history (first render): stay idle so we don't animate the whole board in.
  if (!prev) return "idle"
  if (prev.isEmpty && !isEmpty) return "filling"
  if (!prev.isEmpty && isEmpty) return "clearing"
  if (!prev.isEmpty && !isEmpty) {
    // A different record swapped into this slot always animates, even if this
    // particular cell's value happens to match the outgoing record's.
    if (prev.rowId !== rowId) return "updating"
    if (!Object.is(prev.value, value)) return "updating"
  }
  return "idle"
}

/**
 * Pure projection: turn options + the previous snapshot into a table instance
 * plus the next snapshot to remember. No React, no side effects. Slot `i` maps
 * to `data[pageIndex * rowCount + i]`; anything past the data is an empty slot.
 */
export function buildFutureTable<T>(
  options: FutureTableOptions<T>,
  prev: SlotSnapshot
): { instance: FutureTableInstance<T>; next: SlotSnapshot } {
  const { columns, data, rowCount, defaultEmpty } = options
  const getRowId = options.getRowId ?? defaultGetRowId
  const pageIndex = options.pageIndex ?? 0
  const pageCount = Math.max(1, Math.ceil(data.length / rowCount))
  const offset = pageIndex * rowCount
  const next: SlotSnapshot = new Map()

  const getHeaderCells = (): HeaderCell<T>[] =>
    columns.map((column, ci) => ({
      columnId: columnId(column, ci),
      column,
      size: column.size,
      render: () =>
        typeof column.header === "function" ? column.header() : column.header,
    }))

  const rows: FutureRow<T>[] = Array.from({ length: rowCount }, (_, index) => {
    const dataIndex = offset + index
    const row = data[dataIndex]
    const isEmptyRow = row === undefined
    const rowId = isEmptyRow ? undefined : getRowId(row, dataIndex)

    // Eager so `next` is fully populated by the time we return (no impure getter).
    const cells: FutureCell<T>[] = columns.map((column, ci) => {
      const cid = columnId(column, ci)
      const id = `${index}:${cid}`
      const value = isEmptyRow ? undefined : resolveValue(column, row)
      const isEmpty = isEmptyRow || value === undefined || value === null

      const prevSnap = prev.get(id)
      const phase = diffPhase(prevSnap, isEmpty, value, rowId)
      next.set(id, { value, isEmpty, rowId })

      const emptyState = resolveEmptyState(column.empty, defaultEmpty)

      return {
        id,
        columnId: cid,
        column,
        size: column.size,
        isEmpty,
        value,
        previousValue: prevSnap?.value,
        phase,
        emptyState,
        getEmptyClassName: () => getEmptyClassName(emptyState),
        render: () => {
          if (isEmpty) return null
          if (column.cell)
            return column.cell({ value, row, rowIndex: dataIndex })
          return String(value)
        },
      }
    })

    return { index, isEmpty: isEmptyRow, row, rowId, getCells: () => cells }
  })

  return {
    instance: {
      rowCount,
      pageIndex,
      pageCount,
      getHeaderCells,
      getRows: () => rows,
    },
    next,
  }
}
