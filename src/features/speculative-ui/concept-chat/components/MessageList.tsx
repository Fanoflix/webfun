import type { RefObject } from "react"

import type { Author, ThreadItem } from "../engine/types"
import { DateDivider } from "./DateDivider"
import { MessageGroup } from "./MessageGroup"

/**
 * The scrolling thread. A flat walk over pre-grouped items — no grouping, no
 * sorting, no date logic; all of that arrives already decided.
 */
export function MessageList({
  items,
  now,
  authorFor,
  mountedAt,
  onToggleReaction,
  scrollRef,
  onScroll,
}: {
  items: ThreadItem[]
  now: number
  authorFor: (authorId: string) => Author
  mountedAt: number
  onToggleReaction: (messageId: string, emoji: string) => void
  scrollRef: RefObject<HTMLDivElement | null>
  onScroll: () => void
}) {
  return (
    // `min-h-0` is what actually makes this the scrolling element: a flex child
    // defaults to `min-height: auto`, so without it the list grows to fit its
    // content and pushes the overflow up to an ancestor.
    <div
      data-slot="thread"
      ref={scrollRef}
      onScroll={onScroll}
      className="min-h-0 flex-1 overflow-y-auto"
    >
      {/* `min-h-full` + `justify-end` grows the thread up from the composer
          instead of hanging from the top, so a short conversation sits where a
          chat app puts it. Once it overflows this is a no-op and normal
          scrolling takes over. */}
      <div className="flex min-h-full flex-col justify-end py-2">
        {items.map((item) =>
          item.kind === "divider" ? (
            <DateDivider key={item.id} dayStart={item.dayStart} now={now} />
          ) : (
            <MessageGroup
              key={item.id}
              author={authorFor(item.authorId)}
              startedAt={item.startedAt}
              messages={item.messages}
              now={now}
              mountedAt={mountedAt}
              onToggleReaction={onToggleReaction}
            />
          )
        )}
      </div>
    </div>
  )
}
