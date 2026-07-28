/**
 * The one place that decides what "the search shortcut" is.
 *
 * Two things listen for it — the hook that opens and focuses the field, and the
 * badge that flinches to show it registered — and a badge that reacts to a key
 * the sidebar ignores is worse than no badge at all.
 */
export function isSearchShortcut(event: KeyboardEvent): boolean {
  return event.key === "k" && (event.metaKey || event.ctrlKey)
}
