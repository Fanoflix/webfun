import { cn } from "@/lib/utils"

import type {
  ColumnEmptyState,
  FillFontType,
  ResolvedEmptyState,
} from "./types"

/**
 * The single source of truth for future-table's system-level defaults. Global
 * (table-option) and column-level configs layer on top of these — see
 * `resolveEmptyState`. If you're looking for "what a column falls back to," it's
 * here.
 */

/** System empty-state defaults (lowest precedence). */
export const SYSTEM_EMPTY_STATE: ResolvedEmptyState = {
  fillString: "xxx-xxx",
  fillFontType: "regular",
  fillClassName: "text-muted-foreground/15",
}

/** System className applied per font type. */
export const FONT_TYPE_CLASS: Record<FillFontType, string> = {
  regular: "",
  mono: "font-mono tabular-nums",
}

/** The system empty-state defaults, as a getter. */
export function getDefaultEmptyState(): ResolvedEmptyState {
  return SYSTEM_EMPTY_STATE
}

/** The system className for a font type. */
export function getFontTypeClassName(fontType: FillFontType): string {
  return FONT_TYPE_CLASS[fontType]
}

/**
 * Resolve an empty-state config by layering **system ← global ← column**. Later
 * wins, so a column's `empty` overrides the table-wide `defaultEmpty`, which
 * overrides the system defaults. Each field is independent — an unset field on
 * one level never clobbers a set field on a lower one.
 */
export function resolveEmptyState(
  column?: ColumnEmptyState,
  global?: ColumnEmptyState
): ResolvedEmptyState {
  return { ...SYSTEM_EMPTY_STATE, ...global, ...column }
}

/**
 * The full className for an empty cell: the system font-type class combined with
 * the resolved `fillClassName` (deduped via `cn`).
 */
export function getEmptyClassName(state: ResolvedEmptyState): string {
  return cn(getFontTypeClassName(state.fillFontType), state.fillClassName)
}
