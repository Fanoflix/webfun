import { motion } from "motion/react"
import { Ban } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useStickToBottom } from "@/hooks/useStickToBottom"
import { resolveEase } from "@/features/motion/eases"
import { cn } from "@/lib/utils"
import {
  COLUMN_LABEL,
  INTERACTION_COLOR,
  LIBRARY,
  MONO,
  NET_GRID,
  NETWORK,
  PANEL,
  PANEL_HEADER,
  ROW_HOVER,
} from "../styles"
import type { NodeId } from "../engine/types"
import { HintText } from "../HintText"
import type {
  ChildRow,
  RowStatus,
  Timeline,
  TimelineRow,
  TimelineSegment,
} from "./useTimeline"

/**
 * The teaching half: what each interaction actually cost, laid out like the
 * Network panel people already read every day, and docked to the app the way
 * devtools are.
 *
 * The log *accumulates* rather than resetting per click — comparing two clicks
 * is the whole point, and you can't compare against something that just
 * vanished. It clears when the rung changes (a different data layer's numbers
 * aren't comparable) or when you press the clear button.
 */
export function TimelinePanel({
  timeline,
  onClear,
}: {
  timeline: Timeline
  onClear: () => void
}) {
  // Pins to the newest row as the log tails, unless someone has scrolled up to
  // read an older interaction — in which case they're left where they are.
  const scroll = useStickToBottom([timeline.segments])

  return (
    // Instant: these are annotations on what you're already looking at, and a
    // delay turns "hover to understand a row" into a guessing game.
    <TooltipProvider delay={0}>
      <aside
        className={cn(
          PANEL,
          "showcase-devtools w-full border-t border-border lg:w-[26rem] lg:shrink-0 lg:border-t-0 lg:border-l"
        )}
      >
        <header className={PANEL_HEADER}>
          <div className="flex min-w-0 items-baseline gap-2">
            <p className={COLUMN_LABEL}>Network</p>
            <span className={cn(MONO, "text-muted-foreground")}>
              {timeline.requestCount}{" "}
              {timeline.requestCount === 1 ? "request" : "requests"}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 text-muted-foreground hover:text-foreground"
                  onClick={onClear}
                  disabled={timeline.isEmpty}
                  aria-label="Clear log"
                />
              }
            >
              <Ban className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="left">Clear the log</TooltipContent>
          </Tooltip>
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

        <ScrollArea
          className="min-h-0 flex-1"
          viewportRef={scroll.ref}
          onViewportScroll={scroll.onScroll}
        >
          {timeline.isEmpty ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              {timeline.hasFlow
                ? "Nothing yet. Click a ticket, or add one."
                : "Click a ticket, or add one, to see what it costs."}
            </p>
          ) : (
            timeline.segments.map((segment) => (
              <Segment key={segment.id} segment={segment} />
            ))
          )}
        </ScrollArea>
      </aside>
    </TooltipProvider>
  )
}

/**
 * One interaction: a quiet label, then everything it caused.
 *
 * Fades in and nothing more. It previously used a layout animation, which meant
 * every *existing* segment slid to its new position whenever one arrived — and
 * because the log tails at ten rows, almost every arrival pushes one off the
 * top and shifts everything up. The result was the whole list in motion at the
 * exact moment you were trying to read the one new line.
 *
 * Opacity is the only property animated here on purpose: it's the one that
 * cannot move anything already on screen. Rows that fall off the top now do so
 * instantly, which is far easier to follow than watching them travel.
 */
function Segment({ segment }: { segment: TimelineSegment }) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: resolveEase("smooth") }}
    >
      <header className="flex items-baseline justify-between gap-2 border-b border-border bg-accent/40 px-3 py-1">
        <span
          className={cn(
            "truncate text-[11px]",
            segment.kind === "system" && "text-muted-foreground"
          )}
          style={
            segment.kind === "interaction"
              ? { color: INTERACTION_COLOR }
              : undefined
          }
        >
          {segment.label}
        </span>
        <span className={cn(MONO, "shrink-0 text-muted-foreground")}>
          {segment.duration}
        </span>
      </header>
      <ul>
        {segment.rows.map((row) => (
          <NetworkRow key={row.id} row={row} />
        ))}
      </ul>
    </motion.section>
  )
}

/**
 * Wraps a line so hovering it explains why it beats the rung below.
 *
 * Anchored left, into the app rather than off the edge of the window — the
 * panel is already flush against the right-hand side.
 */
function Hint({
  hint,
  children,
}: {
  hint: string | null
  children: React.ReactNode
}) {
  if (!hint) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>{children}</TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs leading-relaxed">
        <HintText text={hint} />
      </TooltipContent>
    </Tooltip>
  )
}

function NetworkRow({ row }: { row: TimelineRow }) {
  const failed = row.status.kind === "failed"

  return (
    <li className={cn("border-b border-border/60 px-3 py-1.5", ROW_HOVER)}>
      <Hint hint={row.hint}>
        <div className={NET_GRID}>
          <span className="flex min-w-0 items-baseline gap-1.5">
            <SourceTag source={row.source} />
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
          </span>
          <StatusCell status={row.status} />
          <span
            className={cn(MONO, "w-12 text-right text-muted-foreground")}
            style={failed ? { color: NETWORK.error } : undefined}
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
      </Hint>

      {row.children.length > 0 && (
        <ul className="mt-1 ml-1 border-l border-border pl-2.5">
          {row.children.map((child) => (
            <ChildLine key={child.id} child={child} />
          ))}
        </ul>
      )}
    </li>
  )
}

/** How each source writes itself, and in whose colour. */
const SOURCE_META: Partial<Record<NodeId, { label: string; color: string }>> = {
  query: { label: "query", color: LIBRARY.query },
  db: { label: "db", color: LIBRARY.db },
  sync: { label: "sync", color: LIBRARY.sync },
}

/**
 * Which library is responsible for a row. Sits at the left of the line, so a
 * column of tags is scannable — you can see at a glance whether a flow was
 * Query's work or DB's without reading a word of it.
 */
function SourceTag({ source }: { source: NodeId | null }) {
  const meta = source ? SOURCE_META[source] : undefined
  if (!meta) return null
  return (
    <span
      className="shrink-0 rounded-sm px-1 font-mono text-[9px] tracking-wide lowercase"
      style={{
        color: meta.color,
        // A tint of the accent rather than the accent itself: at this size a
        // filled chip would shout louder than the row it labels.
        backgroundColor: `${meta.color}1f`,
      }}
    >
      {meta.label}
    </span>
  )
}

function StatusCell({ status }: { status: RowStatus }) {
  if (status.kind === "pending") {
    return <span className={cn(MONO, "text-muted-foreground/60")}>pending</span>
  }
  if (status.kind === "cancelled") {
    // Chrome's own word for a request nobody is waiting for any more.
    return <span className={cn(MONO, "text-muted-foreground")}>cancelled</span>
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
  optimistic: "text-foreground/80",
  error: "",
}

function ChildLine({ child }: { child: ChildRow }) {
  return (
    <li>
      <Hint hint={child.hint}>
        <div
          className={cn(
            "flex items-baseline gap-2 py-0.5 text-[11px]",
            CHILD_TONE_CLASS[child.tone]
          )}
          style={child.tone === "error" ? { color: NETWORK.error } : undefined}
        >
          <SourceTag source={child.source} />
          <span className="truncate">{child.label}</span>
        </div>
      </Hint>
    </li>
  )
}
