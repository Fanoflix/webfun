import { Minus, Plus } from "lucide-react"
import type { ReactNode } from "react"

/**
 * A fixed, top-right stack of floating "windows" (see {@link Panel}) that can be
 * minimised as a unit into a single square button. Features compose their own
 * panels as children; the container only owns layout + the collapse affordance,
 * so any number of future windows can drop in with a consistent `gap-10` rhythm.
 */
export function FloatingPanels({
  collapsed,
  onExpand,
  children,
}: {
  collapsed: boolean
  onExpand: () => void
  children: ReactNode
}) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand panels"
        className="fixed top-4 right-4 z-50 grid size-9 place-items-center border border-border bg-background text-muted-foreground shadow-lg hover:text-foreground"
      >
        <Plus className="size-4" />
      </button>
    )
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-10">
      {children}
    </div>
  )
}

/**
 * A single floating window inside {@link FloatingPanels}: a bordered card with a
 * header (label + optional action slot). Passing `onCollapse` renders a minus
 * button in the header that minimises the whole container.
 */
export function Panel({
  title,
  onCollapse,
  children,
}: {
  title: string
  onCollapse?: () => void
  children: ReactNode
}) {
  return (
    <section className="flex w-80 flex-col gap-3 border border-border bg-background p-3 shadow-lg">
      <header className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {title}
        </span>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse panels"
            className="text-muted-foreground hover:text-foreground"
          >
            <Minus className="size-4" />
          </button>
        )}
      </header>
      {children}
    </section>
  )
}
