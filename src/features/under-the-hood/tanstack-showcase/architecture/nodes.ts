import type { RungId } from "../engine/rungs"
import type { NodeId } from "../engine/types"

/**
 * The boxes in the diagram, and which of them exist at each rung.
 *
 * This is the picture the whole entry is arguing about: rung 0 has *nothing*
 * between the interface and the server, and every rung after that earns its
 * keep by putting something there.
 */
export type ArchNode = {
  id: NodeId
  label: string
  /** What it is, in a few words. */
  role: string
}

const NODES: Record<NodeId, ArchNode> = {
  ui: { id: "ui", label: "Interface", role: "what you click" },
  query: { id: "query", label: "Query", role: "keeps answers" },
  db: { id: "db", label: "DB", role: "keeps rows" },
  sync: { id: "sync", label: "Sync", role: "sends writes" },
  server: { id: "server", label: "Server", role: "the only slow part" },
}

/**
 * Left to right, the path a request takes at each rung.
 *
 * Rung 2 keeps Query underneath the collection — it's what feeds it — but the
 * diagram shows DB in that position, because at rung 2 that's what the interface
 * is actually talking to.
 */
export const RUNG_NODES: Record<RungId, ArchNode[]> = {
  0: [NODES.ui, NODES.server],
  1: [NODES.ui, NODES.query, NODES.server],
  2: [NODES.ui, NODES.db, NODES.sync, NODES.server],
}
