import { ToolIntro } from "@/components/layout/ToolIntro"
import { ChatFrame } from "../components/ChatFrame"

/**
 * Concept chat's page. Unlike every other tool here — a centred card — this one
 * takes the full area, because a chat app that doesn't fill its window reads as a
 * screenshot of one.
 */
export function ConceptChatDemo() {
  return (
    // The app shell is `min-h-svh` — it grows with its content and never bounds
    // its children, which is right for a page of controls and wrong for a chat
    // app: the frame would stretch and the *window* would scroll instead of the
    // thread. So this page pins its own height, and every flex level below it
    // carries `min-h-0` so the overflow lands on the message list.
    //
    // 6rem is the shell's header (h-12) plus main's vertical padding (p-6). The
    // one place this feature is coupled to AppLayout's chrome.
    <div className="mx-auto flex h-[calc(100svh-6rem)] min-h-0 w-full max-w-5xl min-w-0 flex-col gap-4 self-stretch overflow-hidden">
      <ToolIntro title="Concept chat">
        Some jokes are all timing, and the only way to land one over text is to
        record a video of yourself typing it. Which is absurd — it's a message.
        So what if the message knew how it was meant to be read?
      </ToolIntro>

      <ChatFrame />
    </div>
  )
}
