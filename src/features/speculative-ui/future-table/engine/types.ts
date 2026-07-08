import type { ReactNode } from "react"

/**
 * future-table renders a *fixed* bank of N row slots that exist independently of
 * the data. Data is projected onto the slots by position — slot `i` shows the
 * i-th row of the current page — so the slots never mount/unmount as data
 * changes; only their cell contents do. That stable identity is what lets a cell
 * animate its value flipping over (the split-flap / departure-board effect)
 * instead of React inserting and removing rows.
 *
 * The public surface mirrors TanStack Table (ColumnDef / useTable / getRows /
 * getCells) so it reads familiarly, but the row model is inverted: rows are
 * permanent, data flows through them.
 */

export type FillFontType = "regular" | "mono"

/** How a column advertises the shape of its data while a slot is empty. */
export type ColumnEmptyState = {
  /** The placeholder text, e.g. "xxx-xxx". */
  fillString?: string
  /** Typeface for the placeholder. */
  fillFontType?: FillFontType
  /** Extra classes for the placeholder. */
  fillClassName?: string
}

/** Empty-state with every field filled in. System defaults live in `defaults.ts`. */
export type ResolvedEmptyState = Required<ColumnEmptyState>

/** Context handed to a column's `cell` render function. */
export type CellContext<T> = {
  value: unknown
  row: T
  rowIndex: number
}

export type ColumnDef<T> = {
  /** Stable id. Defaults to `accessorKey`, then a positional fallback. */
  id?: string
  /** Pull the cell value straight off a record key (autocompletes on `T`). */
  accessorKey?: keyof T & string
  /** Or derive it. Takes precedence over `accessorKey` when both are set. */
  accessorFn?: (row: T) => unknown
  /** Column header — string or a renderer. */
  header: string | (() => ReactNode)
  /** Render a filled cell. Defaults to `String(value)`. */
  cell?: (ctx: CellContext<T>) => ReactNode
  /** Fixed column width in px (like TanStack's `size`). */
  size?: number
  /** Placeholder shown while a slot is empty, plus how it's styled. */
  empty?: ColumnEmptyState
}

export type FutureTableOptions<T> = {
  columns: ColumnDef<T>[]
  data: T[]
  /** How many row slots are always rendered. */
  rowCount: number
  /** Which page of `data` is projected onto the slots. Default 0. */
  pageIndex?: number
  /**
   * Table-wide empty-state defaults. Layered as system ← this ← column, so a
   * column's `empty` overrides these, which override the system defaults. Any
   * unset field falls through to the next level. Memoize it at the call site.
   */
  defaultEmpty?: ColumnEmptyState
  /**
   * Stable id for a record. Used to decide whether a slot's cell is the *same
   * record updated* vs a *different record swapped in* (so a record swap always
   * animates, even if a cell value coincidentally matches). Never keys the DOM.
   * Defaults to reading `row.id`, falling back to the slot index.
   */
  getRowId?: (row: T, index: number) => string
}

/**
 * Transition phase for a single cell, derived by diffing this render against the
 * previous one. The engine only computes it; the view layer decides the motion.
 * - `idle`     — unchanged.
 * - `filling`  — was empty, now has a value.
 * - `clearing` — had a value, now empty.
 * - `updating` — value (or the record occupying the slot) changed.
 */
export type CellPhase = "idle" | "filling" | "clearing" | "updating"

export type FutureCell<T> = {
  /** `${rowIndex}:${columnId}` — stable across data changes (position-based). */
  id: string
  columnId: string
  column: ColumnDef<T>
  size?: number
  isEmpty: boolean
  value: unknown
  previousValue: unknown
  phase: CellPhase
  /** Resolved empty-state values (system ← global ← column). */
  emptyState: ResolvedEmptyState
  /** Resolved className for the empty placeholder (font-type class + fillClassName). */
  getEmptyClassName: () => string
  /** Filled content (column.cell or String(value)); null when empty. */
  render: () => ReactNode
}

export type FutureRow<T> = {
  /** The fixed slot position, 0..rowCount-1. This is the React key. */
  index: number
  isEmpty: boolean
  row: T | undefined
  rowId: string | undefined
  getCells: () => FutureCell<T>[]
}

export type HeaderCell<T> = {
  columnId: string
  column: ColumnDef<T>
  size?: number
  render: () => ReactNode
}

export type FutureTableInstance<T> = {
  rowCount: number
  pageIndex: number
  /** ceil(data.length / rowCount), min 1. */
  pageCount: number
  getHeaderCells: () => HeaderCell<T>[]
  getRows: () => FutureRow<T>[]
}

/**
 * Non-generic views the dumb components consume. `FutureCell` / `FutureRow` /
 * `HeaderCell` are structurally assignable to these, which sidesteps generic
 * function-parameter variance at the component boundary while keeping full
 * generic autocomplete at the definition site.
 */
export type RenderCell = {
  id: string
  columnId: string
  size?: number
  isEmpty: boolean
  value: unknown
  previousValue: unknown
  phase: CellPhase
  emptyState: ResolvedEmptyState
  getEmptyClassName: () => string
  render: () => ReactNode
}

export type RenderRow = {
  index: number
  isEmpty: boolean
  getCells: () => RenderCell[]
}

export type RenderHeaderCell = {
  columnId: string
  size?: number
  render: () => ReactNode
}
