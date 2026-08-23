import { AnimatePresence, motion } from "motion/react"

import { resolveEase } from "@/features/motion/eases"
import { cn } from "@/lib/utils"
import { Bar } from "./TicketDetail"
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
      <ul>
        <AnimatePresence initial={false}>
          {tickets.map((ticket) => {
            const selected = ticket.id === selectedId
            return (
              // Collapsing to nothing rather than fading in place: the rows
              // below rise to fill the gap, which is what makes a deletion read
              // as "that one left" instead of "something changed somewhere".
              //
              // `justify-end` is what anchors the content to the bottom edge, so
              // as the height closes the row travels *upwards* out of view
              // rather than being trimmed off at the bottom.
              <motion.li
                key={ticket.id}
                // No `layout` prop: closing the height already makes the rows
                // below rise through normal flow. Adding transform-based
                // movement on top is what turns a clean collapse into jitter.
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: resolveEase("smooth") }}
                className="m-1.25 flex flex-col justify-end overflow-hidden rounded-md bg-popover"
              >
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
                      #{ticket.id} · {ticket.body[0]}
                    </span>
                  </span>
                  <AssigneeAvatar name={ticket.assignee} />
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </ScrollArea>
  )
}

/** Widths that vary per row, so the placeholder reads as a list of things. */
const SKELETON_WIDTHS = ["w-3/4", "w-5/6", "w-2/3", "w-4/5", "w-3/5"]

/**
 * Built from the same markup as a real row, with `Bar` standing in for the
 * text. Because `Bar` renders invisible text inside the same typographic
 * classes, each line box is exactly the height it will be once the data lands —
 * so the list doesn't jump when it swaps.
 */
function ListSkeleton() {
  return (
    <ul className="divide-y divide-border/60">
      {SKELETON_WIDTHS.map((width, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-2.5">
          <span className="size-2.5 shrink-0 rounded-full bg-muted" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm leading-tight">
              <Bar className={width} />
            </span>
            <span className="mt-0.5 block text-xs">
              <Bar className="w-1/2 bg-muted/60" />
            </span>
          </span>
          <span className="size-6 shrink-0 animate-pulse rounded-full bg-muted" />
        </li>
      ))}
    </ul>
  )
}
