import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { BARE_SELECT, MONO } from "../styles"
import type { LoadState } from "../rungs/contract"
import type { Ticket, TicketStatus } from "../engine/types"
import { TicketComments } from "./TicketComments"
import { AssigneeAvatar, STATUS_LABEL, StatusDot } from "./TicketMeta"
import { displayName } from "./people"

const STATUSES: TicketStatus[] = ["open", "in-progress", "done"]

/**
 * The floor under a ticket body. Shared with the skeleton so the loading state
 * and the real thing are exactly the same height — otherwise every load ends
 * with the pane jumping.
 */
const BODY_MIN_H = "min-h-44"

/**
 * The detail pane — where the rungs diverge most visibly. At rung 0 this shows
 * a skeleton on every single selection; at rung 1 a ticket you've already
 * opened paints instantly; at rung 2 it never goes to the server at all.
 *
 * The two actions live in the title bar rather than a footer, which is where an
 * issue tracker puts them: status is the thing you change most, so it's a
 * dropdown you can hit without reading, and delete is an icon beside it.
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

  if (state === "loading") return <DetailSkeleton />

  // Ready-but-missing means the ticket is gone (deleted, or never existed).
  // This branch used to fall through to the skeleton, which spun forever.
  if (state === "error" || !ticket) {
    return (
      <div className="grid h-full place-items-center p-8">
        <p className="max-w-56 text-center text-sm text-balance text-muted-foreground">
          That ticket isn't there any more.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 space-y-3 border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base leading-snug font-semibold text-pretty">
            {ticket.title}
          </h2>

          <div className="flex shrink-0 items-center gap-1">
            <Select
              value={ticket.status}
              onValueChange={(value) =>
                onStatus(ticket.id, value ?? ticket.status)
              }
              disabled={isMutating}
            >
              <SelectTrigger
                size="sm"
                className={cn(BARE_SELECT, "text-xs")}
                aria-label="Status"
              >
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <StatusDot status={ticket.status} />
                    {STATUS_LABEL[ticket.status]}
                  </span>
                </SelectValue>
              </SelectTrigger>
              {/* The popup is portalled to the document root, which puts it
                *outside* `.showcase-app` — so it has to carry the scope itself
                or it inherits webfun's palette instead of the app's. */}
              <SelectContent className="showcase-app">
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status} className="text-xs">
                    <span className="flex items-center gap-2">
                      <StatusDot status={status} />
                      {STATUS_LABEL[status]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* A real tooltip rather than the native `title`, whose delay is
                the operating system's and can't be turned off. */}
            <TooltipProvider delay={0}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      disabled={isMutating}
                      onClick={() => onDelete(ticket.id)}
                      aria-label="Delete ticket"
                    />
                  }
                >
                  <Trash2 className="size-4" />
                </TooltipTrigger>
                <TooltipContent side="left">Delete ticket</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AssigneeAvatar name={ticket.assignee} className="size-5" />
          <span className="text-sm">{displayName(ticket.assignee)}</span>
          <span className="text-xs text-muted-foreground">Assignee</span>
          <span className={cn(MONO, "ml-auto text-muted-foreground")}>
            #{ticket.id}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
        {/* A floor under the body rather than a margin below it: short tickets
            and long ones then start their comment thread at the same place, so
            the pane doesn't reflow as you click between them. */}
        <div className={cn(BODY_MIN_H, "space-y-3")}>
          {ticket.body.map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-pretty">
              {line}
            </p>
          ))}
        </div>
        <TicketComments comments={ticket.comments} />
      </div>
    </div>
  )
}

/**
 * The loading state, built from the *same* markup as the real pane with
 * `Bar` standing in for each piece of text.
 *
 * Matching heights by hand never quite works — a bar of some chosen pixel
 * height is not the height of a line box. `Bar` instead renders real (invisible)
 * text inside the same typographic classes, so the line box is identical by
 * construction and the swap from skeleton to content doesn't move anything.
 */
function DetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 space-y-3 border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base leading-snug font-semibold">
            <Bar className="w-2/3" />
          </h2>
          <div className="flex shrink-0 items-center gap-1">
            <div className="h-8 w-[8.5rem] animate-pulse rounded bg-muted/60" />
            <div className="size-8" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-5 shrink-0 animate-pulse rounded-full bg-muted" />
          <span className="text-sm">
            <Bar className="w-24" />
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
        <div className={cn(BODY_MIN_H, "space-y-3")}>
          <p className="text-sm leading-relaxed">
            <Bar className="w-full" />
          </p>
          <p className="text-sm leading-relaxed">
            <Bar className="w-5/6" />
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * A placeholder shaped like one line of whatever text it sits in. The text is
 * really there and really invisible, which is what makes the height exact.
 */
export function Bar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block max-w-full animate-pulse rounded bg-muted text-transparent select-none",
        className
      )}
    >
      &nbsp;
    </span>
  )
}
