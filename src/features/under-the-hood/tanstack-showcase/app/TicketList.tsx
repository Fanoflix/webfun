import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LoadState } from "../rungs/contract"
import type { Ticket } from "../engine/types"
import { AssigneeAvatar, StatusDot } from "./TicketMeta"

/** The inbox column. View only. */
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
  if (state === "loading" && tickets.length === 0) return <ListSkeleton />

  return (
    <ScrollArea className="h-full">
      <ul className="divide-y divide-border/60">
        {tickets.map((ticket) => {
          const selected = ticket.id === selectedId
          return (
            <li key={ticket.id}>
              <button
                type="button"
                onClick={() => onSelect(ticket.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  selected ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                <StatusDot status={ticket.status} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm leading-tight">
                    {ticket.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    #{ticket.id} · {ticket.body}
                  </span>
                </span>
                <AssigneeAvatar name={ticket.assignee} />
              </button>
            </li>
          )
        })}
      </ul>
    </ScrollArea>
  )
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-border/60">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-2.5">
          <span className="size-1.5 shrink-0 rounded-full bg-muted" />
          <span className="min-w-0 flex-1 space-y-1.5">
            <span className="block h-3 w-3/4 animate-pulse rounded bg-muted" />
            <span className="block h-2.5 w-1/2 animate-pulse rounded bg-muted/60" />
          </span>
          <span className="size-6 shrink-0 animate-pulse rounded-full bg-muted" />
        </li>
      ))}
    </ul>
  )
}
