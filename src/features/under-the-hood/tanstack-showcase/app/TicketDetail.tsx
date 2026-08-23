import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { MONO } from "../styles"
import type { LoadState } from "../rungs/contract"
import type { Ticket, TicketStatus } from "../engine/types"
import { AssigneeAvatar, StatusBadge } from "./TicketMeta"

const STATUSES: TicketStatus[] = ["open", "in-progress", "done"]

/**
 * The detail pane — where the rungs diverge most visibly. At rung 0 this shows
 * a skeleton on every single selection; at rung 1 a ticket you've already
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
      <div className="grid h-full place-items-center p-8">
        <p className="max-w-56 text-center text-sm text-balance text-muted-foreground">
          Pick a ticket from the inbox.
        </p>
      </div>
    )
  }

  if (state === "loading" || !ticket) return <DetailSkeleton />

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base leading-snug font-semibold text-pretty">
            {ticket.title}
          </h2>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <AssigneeAvatar name={ticket.assignee} className="size-5" />
          <span className={cn(MONO, "text-muted-foreground")}>
            #{ticket.id} · {ticket.assignee}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          {ticket.body}
        </p>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
        <ToggleGroup
          size="sm"
          variant="outline"
          spacing={0}
          value={[ticket.status]}
          onValueChange={(value) => {
            // Clicking the active status off would mean "no status", which the
            // model doesn't have — ignore it rather than inventing one.
            if (value.length === 0) return
            onStatus(ticket.id, value[0] as TicketStatus)
          }}
          disabled={isMutating}
        >
          {STATUSES.map((status) => (
            <ToggleGroupItem key={status} value={status} className="text-xs">
              {status}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Button
          size="sm"
          variant="ghost"
          disabled={isMutating}
          onClick={() => onDelete(ticket.id)}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          Delete
        </Button>
      </footer>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-3 border-b border-border px-5 py-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted/60" />
      </div>
      <div className="flex-1 space-y-2 px-5 py-4">
        <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted/60" />
      </div>
    </div>
  )
}
