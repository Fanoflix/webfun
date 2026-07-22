import { CHATTER } from "../engine/defaults"
import { useConceptChat } from "../engine/useConceptChat"
import { ChatSidebar } from "./ChatSidebar"
import { Composer } from "./Composer"
import { MessageList } from "./MessageList"
import { TypingIndicator } from "./TypingIndicator"

/**
 * The chat app: rail on the left, thread and composer on the right.
 *
 * The only component that touches the hook — everything below it takes props and
 * renders. It holds no state of its own.
 */
export function ChatFrame() {
  const {
    items,
    now,
    viewer,
    authorFor,
    isTyping,
    mountedAt,
    composer,
    toggleReaction,
    reset,
    remainingMs,
    extend,
    skipResetConfirm,
    setSkipResetConfirm,
    scroll,
  } = useConceptChat()

  return (
    <div className="flex min-h-0 flex-1 border border-border">
      <ChatSidebar
        chatter={CHATTER}
        viewer={viewer}
        remainingMs={remainingMs}
        onExtend={extend}
        onReset={reset}
        skipConfirm={skipResetConfirm}
        onSkipConfirmChange={setSkipResetConfirm}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-11.25 shrink-0 items-center border-b border-border px-4">
          <span className="text-sm font-medium">{CHATTER.name}</span>
        </header>

        <MessageList
          items={items}
          now={now}
          authorFor={authorFor}
          mountedAt={mountedAt}
          onToggleReaction={toggleReaction}
          scrollRef={scroll.ref}
          onScroll={scroll.onScroll}
        />

        {/* `relative` anchors the typing indicator, which floats above the
            composer rather than occupying a row of its own. */}
        <div className="relative shrink-0">
          <TypingIndicator author={CHATTER} active={isTyping} />
          <Composer composer={composer} />
        </div>
      </div>
    </div>
  )
}
