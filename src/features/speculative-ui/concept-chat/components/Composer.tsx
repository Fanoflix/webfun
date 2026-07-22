import type { KeyboardEvent } from "react"
import { Plus, SendHorizontal, Smile, X } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"
import { gifUrl, imageUrl } from "../engine/assets"
import { CHAT_EASE } from "../engine/defaults"
import type { ComposerApi } from "../engine/useComposer"
import { AttachPanel } from "./AttachPanel"
import { EmojiPicker } from "./EmojiPicker"

/**
 * The input bar. Discord-shaped: `+` on the left, emoji on the right, no send
 * button on desktop — `Enter` sends, `Shift+Enter` breaks the line.
 *
 * **Animation 3.** The bar grows with content over 0.15s, expo out, up to
 * `max-h-44`. See `AutoGrowTextarea` for why that height is CSS-driven.
 */

export function Composer({ composer }: { composer: ComposerApi }) {
  const reduced = useReducedMotion()

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enter is a newline; a bare Enter sends. `isComposing` guards IME
    // input, where Enter commits a candidate and must not fire the message.
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return
    }
    event.preventDefault()
    composer.submit()
  }

  return (
    // Full `layout`, not `layout="size"`: the size-only variant snaps the box to
    // its new position and animates height alone, so the top edge jumps up and
    // the bar visibly unrolls downward. Animating position too keeps the bottom
    // edge pinned to the frame, which is what reads as the composer growing.
    <motion.div
      layout={reduced ? false : true}
      transition={
        reduced ? { duration: 0 } : { duration: 0.15, ease: CHAT_EASE }
      }
      // No bottom margin: the bar runs to the frame's edge, which puts its
      // bottom border on the same line as the rail's footer row across the
      // divider. Any gap here breaks that alignment.
      className="border-t border-border bg-secondary/40"
    >
      {/* The rows carry `layout` as well. A layout animation resizes its subject
          with a transform, which squashes whatever is inside it unless the
          children counter-scale — without this the thumbnails and the input
          visibly distort for the duration. */}
      {composer.attachments.length > 0 && (
        <motion.div
          layout={reduced ? false : true}
          className="flex flex-wrap gap-2 border-b border-border p-2"
        >
          {composer.attachments.map((segment, index) => (
            <div key={index} className="relative">
              <img
                src={
                  segment.kind === "image"
                    ? imageUrl(segment.assetId)
                    : segment.kind === "gif"
                      ? gifUrl(segment.assetId)
                      : undefined
                }
                alt=""
                className="block size-16 border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => composer.removeAttachment(index)}
                aria-label="Remove attachment"
                className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center border border-border bg-background text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </motion.div>
      )}

      <motion.div
        layout={reduced ? false : true}
        className="flex items-end gap-1 p-1.5"
      >
        {/* The trigger must be a real DOM element: Base UI clones it to attach
            its own click handler, ref and aria state. A wrapper component that
            doesn't forward props swallows all of that, and the button renders
            fine while doing nothing. */}
        <AttachPanel
          onPickImage={composer.attachImage}
          onPickGif={composer.attachGif}
          trigger={
            <button
              type="button"
              aria-label="Add attachment"
              className={ICON_BUTTON}
            >
              <Plus className="size-4" />
            </button>
          }
        />

        <AutoGrowTextarea
          value={composer.text}
          onChange={composer.setText}
          onKeyDown={onKeyDown}
          inputRef={composer.inputRef}
        />

        <EmojiPicker
          onPick={composer.insertAtCaret}
          trigger={
            <button
              type="button"
              aria-label="Insert emoji"
              className={ICON_BUTTON}
            >
              <Smile className="size-4" />
            </button>
          }
        />

        {/* Enter-to-send has no mobile equivalent — no Shift key, and the soft
            keyboard's return inserts a newline. So small screens get a button. */}
        <button
          type="button"
          onClick={composer.submit}
          disabled={!composer.canSend}
          aria-label="Send message"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-150 sm:hidden",
            composer.canSend ? "hover:text-foreground" : "opacity-40"
          )}
        >
          <SendHorizontal className="size-4" />
        </button>
      </motion.div>
    </motion.div>
  )
}

/**
 * Auto-sizing textarea with no JavaScript and no effect.
 *
 * The textarea and an invisible copy of its text share one grid cell, so the copy
 * — which wraps the same way — dictates the height and the textarea stretches to
 * fill it. The usual approach (measure `scrollHeight` in a layout effect on every
 * keystroke) forces a synchronous reflow per character; this costs nothing.
 *
 * The trailing space in the sizer keeps a trailing newline from collapsing, which
 * would make the box shrink a line early.
 */
function AutoGrowTextarea({
  value,
  onChange,
  onKeyDown,
  inputRef,
}: {
  value: string
  onChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  inputRef: ComposerApi["inputRef"]
}) {
  return (
    <div className="grid max-h-44 flex-1 overflow-y-auto">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder="Message FakeAmmar"
        className="col-start-1 row-start-1 resize-none overflow-hidden bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
      />
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 px-2 py-1.5 text-sm whitespace-pre-wrap"
      >
        {value + " "}
      </span>
    </div>
  )
}

/**
 * Shared styling for the composer's icon buttons. A plain string rather than a
 * component because these are handed to `Popover.Trigger`, which needs a real
 * element it can clone props onto.
 */
const ICON_BUTTON =
  "flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-foreground"
