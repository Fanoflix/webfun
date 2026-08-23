import { AnimatePresence, motion } from "motion/react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { resolveEase } from "@/features/motion/eases"
import { cn } from "@/lib/utils"
import {
  COLUMN_LABEL,
  MONO,
  NET_GRID,
  NETWORK,
  PANEL,
  PANEL_HEADER,
} from "../styles"
import type { ChildRow, RowStatus, Timeline, TimelineRow } from "./useTimeline"

/**
 * The teaching half: what the last interaction actually cost, laid out like the
 * Network panel people already read every day. Sits on the right the way
 * devtools do, and stays put across every mode.
 */
export function TimelinePanel({ timeline }: { timeline: Timeline }) {
  return (
    <aside
      className={cn(
        PANEL,
        "showcase-devtools w-full border-t border-border lg:w-[26rem] lg:shrink-0 lg:border-t-0 lg:border-l"
      )}
    >
      <header className={PANEL_HEADER}>
        <div className="min-w-0">
          <p className={COLUMN_LABEL}>Network</p>
          <p className="truncate text-sm">{timeline.title}</p>
        </div>
        <span className={cn(MONO, "shrink-0 text-muted-foreground")}>
          {timeline.duration}
        </span>
      </header>

      <div
        className={cn(
          NET_GRID,
          COLUMN_LABEL,
          "shrink-0 border-b border-border px-3 py-1.5"
        )}
      >
        <span>Name</span>
        <span className="text-right">Status</span>
        <span className="w-12 text-right">Time</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {timeline.isEmpty ? (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            Click a ticket, or add one, to see what it costs.
          </p>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {timeline.rows.map((row) => (
                <NetworkRow key={row.id} row={row} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </ScrollArea>
    </aside>
  )
}

function NetworkRow({ row }: { row: TimelineRow }) {
  const failed = row.status.kind === "failed"

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: resolveEase("smooth") }}
      className="border-b border-border/60 px-3 py-1.5 hover:bg-accent/40"
    >
      <div className={NET_GRID}>
        <span
          className={cn(
            MONO,
            "truncate",
            row.status.kind === "local" && "text-muted-foreground"
          )}
          title={row.name}
        >
          {row.name}
        </span>
        <StatusCell status={row.status} />
        <span
          className={cn(
            MONO,
            "w-12 text-right",
            failed ? "text-[var(--net-error)]" : "text-muted-foreground"
          )}
          style={{ ["--net-error" as string]: NETWORK.error }}
        >
          {row.time}
        </span>
      </div>

      {/* The waterfall: a hairline rather than a column, so the panel stays
          narrow enough to read while overlap is still visible. */}
      {row.bar && (
        <div className="mt-1 h-[2px] w-full bg-border/50">
          <div
            className="h-full"
            style={{
              marginLeft: `${row.bar.left * 100}%`,
              width: `${Math.max(row.bar.width * 100, 1.5)}%`,
              backgroundColor: failed ? NETWORK.error : NETWORK.waiting,
            }}
          />
        </div>
      )}

      {row.children.length > 0 && (
        <ul className="mt-1 ml-1 border-l border-border pl-2.5">
          {row.children.map((child) => (
            <ChildLine key={child.id} child={child} />
          ))}
        </ul>
      )}
    </motion.li>
  )
}

function StatusCell({ status }: { status: RowStatus }) {
  if (status.kind === "pending") {
    return <span className={cn(MONO, "text-muted-foreground/60")}>pending</span>
  }
  if (status.kind === "local") {
    // Chrome's own idiom for "this didn't cost a request": a parenthesised
    // note where the status code would be.
    return (
      <span className={cn(MONO, "text-muted-foreground")}>
        ({status.label})
      </span>
    )
  }
  const failed = status.kind === "failed"
  return (
    <span
      className={MONO}
      style={failed ? { color: NETWORK.error } : undefined}
    >
      {status.code}
    </span>
  )
}

const CHILD_TONE_CLASS: Record<ChildRow["tone"], string> = {
  cache: "text-muted-foreground",
  write: "text-muted-foreground",
  invalidate: "text-foreground/70",
  error: "",
}

function ChildLine({ child }: { child: ChildRow }) {
  return (
    <li
      className={cn(
        "flex items-baseline gap-2 py-0.5 text-[11px]",
        CHILD_TONE_CLASS[child.tone]
      )}
      style={child.tone === "error" ? { color: NETWORK.error } : undefined}
    >
      <span className="truncate">{child.label}</span>
    </li>
  )
}
