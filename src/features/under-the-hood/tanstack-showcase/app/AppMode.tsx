import { LifeBuoy } from "lucide-react"

import { cn } from "@/lib/utils"
import { COLUMN_LABEL, PANEL, PANEL_HEADER } from "../styles"
import type { TicketsView } from "../rungs/contract"
import type { ShowcaseEvent } from "../engine/types"
import { Composer } from "./Composer"
import { AppStatus } from "./AppStatus"
import { TicketDetail } from "./TicketDetail"
import { TicketList } from "./TicketList"

/**
 * App mode: the product, dressed as a product.
 *
 * It reads as its own application window — its own header, its own inbox
 * column, its own detail pane — precisely so it doesn't blur into the teaching
 * apparatus around it. The `showcase-app` class swaps the shadcn tokens for a
 * neutral grey palette with a white primary and rounded controls, so everything
 * underneath stops looking like webfun without a single per-component override.
 *
 * The only tell that anything unusual is going on is the hint bubble.
 */
export function AppMode({
  view,
  selectedId,
  onSelect,
  onBack,
  latestEvent,
}: {
  view: TicketsView
  selectedId: number | null
  onSelect: (id: number) => void
  onBack: () => void
  latestEvent: ShowcaseEvent | undefined
}) {
  return (
    // A floor on narrow screens, where this sits above the instrument panel
    // rather than beside it and would otherwise be squeezed to nothing.
    <section
      className={cn(
        PANEL,
        "showcase-app min-h-[28rem] min-w-0 flex-1 lg:min-h-0"
      )}
    >
      <header className={PANEL_HEADER}>
        <div className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded bg-primary text-primary-foreground">
            <LifeBuoy className="size-3" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Fake Application
          </span>
          <span className={cn(COLUMN_LABEL, "hidden sm:block")}>
            support inbox
          </span>
        </div>
        <AppStatus event={latestEvent} error={view.error} />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* The inbox is the raised surface and the detail pane is the canvas
            under it — `card` is a step lighter than `background` in both of the
            app's themes, so the centre reads as recessed. */}
        {/* Below `lg` the list and the detail take turns: a 19rem column on a
            390px screen leaves the detail about 80px, which is no pane at all.
            Side by side from `lg` up, where there's room for both.

            `min-h-0` so the list inside can shrink and scroll on its own,
            rather than pushing the column past the bottom of the window. */}
        <div
          data-pane="inbox"
          className={cn(
            "min-h-0 w-full shrink-0 flex-col border-border bg-card/35 lg:flex lg:w-[19rem] lg:border-r",
            selectedId === null ? "flex" : "hidden"
          )}
        >
          <div className="shrink-0 border-b border-border px-2 py-1.5">
            <Composer onCreate={view.create} isMutating={view.isMutating} />
          </div>
          <div className="min-h-0 flex-1">
            <TicketList
              tickets={view.list}
              state={view.listState}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </div>
        </div>

        <div
          data-pane="detail"
          className={cn(
            "min-w-0 flex-1 lg:block",
            selectedId === null ? "hidden" : "block"
          )}
        >
          <TicketDetail
            onBack={onBack}
            ticket={view.detail}
            state={view.detailState}
            isMutating={view.isMutating}
            onStatus={view.setStatus}
            onDelete={view.remove}
          />
        </div>
      </div>
    </section>
  )
}
