import type { TicketsView } from "../rungs/contract"
import type { ShowcaseEvent } from "../engine/types"
import { Composer } from "./Composer"
import { HintBubble } from "./HintBubble"
import { TicketDetail } from "./TicketDetail"
import { TicketList } from "./TicketList"

/** App mode: the product itself, with a hint bubble narrating what just happened. */
export function AppMode({
  view,
  selectedId,
  onSelect,
  latestEvent,
}: {
  view: TicketsView
  selectedId: number | null
  onSelect: (id: number) => void
  latestEvent: ShowcaseEvent | undefined
}) {
  return (
    <div className="relative flex h-full flex-col gap-3 p-3">
      <HintBubble event={latestEvent} />

      <Composer onCreate={view.create} isMutating={view.isMutating} />

      {view.error && (
        <p className="border border-destructive/50 px-2 py-1 text-xs text-destructive">
          {view.error}
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[1.2fr_1fr]">
        <div className="min-h-0 overflow-auto">
          <TicketList
            tickets={view.list}
            state={view.listState}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </div>
        <div className="min-h-0 overflow-auto border border-border">
          <TicketDetail
            ticket={view.detail}
            state={view.detailState}
            isMutating={view.isMutating}
            onStatus={view.setStatus}
            onDelete={view.remove}
          />
        </div>
      </div>
    </div>
  )
}
