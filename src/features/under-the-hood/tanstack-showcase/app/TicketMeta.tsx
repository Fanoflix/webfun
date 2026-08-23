import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TicketStatus } from "../engine/types"

/**
 * The two bits of ticket chrome that appear in both the list and the detail.
 * Shared as components rather than repeated class strings, so a status can
 * never look like two different things in two places.
 */

const STATUS_STYLE: Record<TicketStatus, string> = {
  open: "text-foreground",
  "in-progress": "text-primary",
  done: "text-muted-foreground",
}

const STATUS_DOT: Record<TicketStatus, string> = {
  open: "bg-foreground/60",
  "in-progress": "bg-primary",
  done: "bg-muted-foreground/40",
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={STATUS_STYLE[status]}>{status}</Badge>
}

export function StatusDot({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        "size-2.5 shrink-0 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/10",
        STATUS_DOT[status]
      )}
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
