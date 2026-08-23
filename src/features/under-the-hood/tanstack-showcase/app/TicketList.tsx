import { cn } from "@/lib/utils"
import type { LoadState } from "../rungs/contract"
import type { Ticket } from "../engine/types"

const STATUS_DOT: Record<Ticket["status"], string> = {
  open: "bg-muted-foreground",
  "in-progress": "bg-primary",
  done: "bg-primary/30",
}

/** The ticket list. View only. */
export function TicketList({
  tickets,
  state,
  selectedId,
  onSelect,
}: {
  tickets: Ticket[]
  state: LoadState
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  if (state === "loading" && tickets.length === 0) {
    return <ListSkeleton />
  }

  return (
    <ul className="divide-y divide-border border border-border">
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <button
            type="button"
            onClick={() => onSelect(ticket.id)}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
              ticket.id === selectedId
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <span
              className={cn("size-1.5 shrink-0", STATUS_DOT[ticket.status])}
              aria-hidden
            />
            <span className="flex-1 truncate">{ticket.title}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              {ticket.assignee}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-border border border-border">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-2">
          <span className="size-1.5 shrink-0 bg-muted" />
          <span className="h-3 flex-1 animate-pulse bg-muted" />
        </li>
      ))}
    </ul>
  )
}
