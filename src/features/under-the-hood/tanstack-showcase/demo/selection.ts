/**
 * Which row to select once the current one is deleted.
 *
 * Upwards, like a mail client — falling to the next one only when the first row
 * is the one going away. Without this the selection stays pointed at a row that
 * no longer exists, and the detail pane spends the rest of its life asking the
 * server for a ticket that isn't there.
 */
export function neighbourOf(list: { id: number }[], id: number): number | null {
  const index = list.findIndex((row) => row.id === id)
  if (index === -1) return null
  // Indexing is typed as always-defined, but the ends of a list really are
  // empty — so check the bounds rather than the value.
  if (index > 0) return list[index - 1].id
  if (index + 1 < list.length) return list[index + 1].id
  return null
}
