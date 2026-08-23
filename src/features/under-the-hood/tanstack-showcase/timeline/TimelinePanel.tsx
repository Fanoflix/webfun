import { AnimatePresence, motion } from "motion/react"

import { resolveEase } from "@/features/motion/eases"
import { cn } from "@/lib/utils"
import type { Timeline } from "./useTimeline"

/** Which box in the system an event happened at. */
const NODE_ACCENT: Record<string, string> = {
  ui: "bg-foreground",
  query: "bg-primary",
  db: "bg-primary",
  sync: "bg-muted-foreground",
  server: "bg-muted-foreground",
}

/**
 * The flow of everything one interaction caused, newest at the bottom.
 *
 * Always on screen, whichever mode you're in — it's the through-line that makes
 * the modes feel like views of one system rather than separate pages.
 */
export function TimelinePanel({ timeline }: { timeline: Timeline }) {
  return (
    <aside className="flex h-full w-full flex-col border border-border md:w-64">
      <header className="border-b border-border px-3 py-2">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Timeline
        </p>
        <p className="mt-0.5 truncate text-sm">{timeline.title}</p>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {timeline.isEmpty ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            Click a ticket, or add one, to see what happens underneath.
          </p>
        ) : (
          <ol className="space-y-0.5">
            <AnimatePresence initial={false}>
              {timeline.rows.map((row) => (
                <motion.li
                  key={row.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, ease: resolveEase("smooth") }}
                  className="flex items-baseline gap-2 px-1 py-1"
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 translate-y-[-1px]",
                      NODE_ACCENT[row.node] ?? "bg-muted-foreground"
                    )}
                    aria-hidden
                  />
                  <span className="flex-1 text-xs leading-snug">
                    {row.label}
                    {row.detail && (
                      <span className="ml-1 block font-mono text-[10px] text-muted-foreground">
                        {row.detail}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
                    {row.offset}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </div>

      <footer className="border-t border-border px-3 py-1.5 text-right">
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {timeline.duration}
        </span>
      </footer>
    </aside>
  )
}
