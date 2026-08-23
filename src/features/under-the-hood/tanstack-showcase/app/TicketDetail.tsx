import { Button } from "@/components/ui/button"
import type { LoadState } from "../rungs/contract"
import type { Ticket, TicketStatus } from "../engine/types"

const STATUSES: TicketStatus[] = ["open", "in-progress", "done"]

/**
 * The detail pane. This is where the rungs diverge most visibly: at rung 0 it
 * shows a spinner on every single selection, at rung 1 a ticket you've already
 * opened paints instantly.
 */
export function TicketDetail({
  ticket,
  state,
  isMutating,
  onStatus,
  onDelete,
}: {
  ticket: Ticket | undefined
  state: LoadState
  isMutating: boolean
  onStatus: (id: number, status: TicketStatus) => void
  onDelete: (id: number) => void
}) {
  if (state === "idle") {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Pick a ticket to see it.
      </p>
    )
  }

  if (state === "loading" || !ticket) {
    return (
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 animate-pulse bg-muted" />
        <div className="h-3 w-1/3 animate-pulse bg-muted" />
        <span className="block text-xs text-muted-foreground">
          fetching from the server…
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-pretty">{ticket.title}</h3>
        <p className="font-mono text-xs text-muted-foreground">
          #{ticket.id} · {ticket.assignee}
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {STATUSES.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={ticket.status === status ? "default" : "outline"}
            disabled={isMutating}
            onClick={() => onStatus(ticket.id, status)}
          >
            {status}
          </Button>
        ))}
      </div>

      <Button
        size="sm"
        variant="destructive"
        disabled={isMutating}
        onClick={() => onDelete(ticket.id)}
      >
        Delete
      </Button>
    </div>
  )
}
