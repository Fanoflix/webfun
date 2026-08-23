import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { STATUS_COLOR } from "../styles"
import type { TicketStatus } from "../engine/types"

/**
 * The two bits of ticket chrome that appear in both the list and the detail.
 * Shared as components rather than repeated class strings, so a status can
 * never look like two different things in two places.
 */

/**
 * How each status is written. The stored value stays `open` — this is a label
 * change, not a data change, so nothing in the server or the rungs shifts.
 */
export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Todo",
  "in-progress": "In progress",
  done: "Done",
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge
      style={status === "open" ? undefined : { color: STATUS_COLOR[status] }}
    >
      {STATUS_LABEL[status]}
    </Badge>
  )
}

export function StatusDot({ status }: { status: TicketStatus }) {
  // An empty ring for todo: nothing has been done to it yet, so there's nothing
  // to fill in. `currentColor` via the foreground keeps it white on dark and
  // dark on light, rather than a hard-coded white that vanishes in light mode.
  if (status === "open") {
    return (
      <span
        className="size-2.5 shrink-0 rounded-full border-1 border-foreground/70"
        aria-hidden
      />
    )
  }
  return (
    <span
      style={{ backgroundColor: STATUS_COLOR[status] }}
      className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/10"
      aria-hidden
    />
  )
}

export function AssigneeAvatar({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  return (
    <Avatar className={cn("size-6", className)}>
      <AvatarFallback className="bg-muted text-[10px] font-medium uppercase">
        {name.slice(0, 2)}
      </AvatarFallback>
    </Avatar>
  )
}
