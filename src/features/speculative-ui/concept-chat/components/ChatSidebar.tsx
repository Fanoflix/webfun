import { Popover } from "@base-ui/react/popover"
import { Trash2 } from "lucide-react"
import { useAnimate, useReducedMotion } from "motion/react"
import { useState } from "react"

import { CHAT_EASE } from "../engine/defaults"
import { formatCountdown } from "../engine/time"
import type { Author } from "../engine/types"

/**
 * The conversation rail: one chat at the top, you and the controls at the bottom.
 *
 * Only one divider — above the footer — because that one separates two different
 * kinds of thing. The conversation entry doesn't need a rule under it; whitespace
 * already says it's alone.
 */
export function ChatSidebar({
  chatter,
  viewer,
  remainingMs,
  onExtend,
  onReset,
  skipConfirm,
  onSkipConfirmChange,
}: {
  chatter: Author
  viewer: Author
  remainingMs: number
  onExtend: () => void
  onReset: () => void
  skipConfirm: boolean
  onSkipConfirmChange: (skip: boolean) => void
}) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar max-sm:hidden">
      <div className="flex-1">
        <div className="flex items-center gap-2 border-b border-border bg-accent p-2.5 text-sm">
          <img
            src={chatter.avatarUrl}
            alt=""
            className="size-6 shrink-0 rounded-full object-cover"
          />
          <span className="truncate">{chatter.name}</span>
        </div>
      </div>

      <ExpiryRow remainingMs={remainingMs} onExtend={onExtend} />

      <div className="flex items-center gap-2 border-t border-border p-2">
        <img
          src={viewer.avatarUrl}
          alt=""
          className="size-6 shrink-0 rounded-full object-cover"
        />
        <span className="min-w-0 flex-1 truncate text-sm">{viewer.name}</span>
        <ResetButton
          onReset={onReset}
          skipConfirm={skipConfirm}
          onSkipConfirmChange={onSkipConfirmChange}
        />
      </div>
    </aside>
  )
}

/**
 * How long this conversation has left, and a way to give it more.
 *
 * Shown rather than hidden: a demo that silently wipes itself is a bug report,
 * and the same countdown that warns you is the thing you click to stop it.
 */
function ExpiryRow({
  remainingMs,
  onExtend,
}: {
  remainingMs: number
  onExtend: () => void
}) {
  // Under a minute this is about to happen to you, not a background detail.
  const urgent = remainingMs < 60_000

  const [scope, animate] = useAnimate<HTMLSpanElement>()
  const reduced = useReducedMotion()

  /**
   * The button jumps the clock back to ten minutes, which — without this — is a
   * number quietly changing in the corner. The pop is the only feedback that the
   * click did anything.
   *
   * Fired imperatively rather than through a `key` remount: the countdown is
   * re-rendering every second anyway, and a keyed remount would restart the
   * animation on whichever tick happened to land next.
   */
  const extend = () => {
    onExtend()
    if (reduced) return
    void animate(
      scope.current,
      { scale: [1, 1.25, 1] },
      { duration: 0.085, ease: CHAT_EASE }
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 px-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase">
      <span className="flex min-w-0 gap-1.5 truncate">
        <span>Demo resets in </span>
        {/* `inline-block` so the scale applies — transforms are ignored on
            inline boxes. */}
        <span
          ref={scope}
          className={`inline-block font-mono font-bold tracking-wider tabular-nums ${urgent ? "text-destructive" : "text-foreground"}`}
        >
          {formatCountdown(remainingMs)}
        </span>
      </span>
      <button
        type="button"
        onClick={extend}
        aria-label="Restart the reset timer"
        className="shrink-0 whitespace-nowrap transition-colors duration-150 hover:text-foreground"
      >
        Reset timer
      </button>
    </div>
  )
}

/**
 * The kill switch. Confirms by default — it throws away everything the visitor
 * typed, and it sits one slip away from the avatar you click by habit — but
 * anyone resetting repeatedly can turn that off, and the choice persists.
 */
function ResetButton({
  onReset,
  skipConfirm,
  onSkipConfirmChange,
}: {
  onReset: () => void
  skipConfirm: boolean
  onSkipConfirmChange: (skip: boolean) => void
}) {
  /**
   * The checkbox is held locally and only committed on confirm. Writing straight
   * through would satisfy the preference the instant it's ticked — which swaps
   * this component to the no-confirm variant and rips the open dialog off the
   * screen mid-decision.
   */
  const [dontAskAgain, setDontAskAgain] = useState(false)

  const confirm = () => {
    if (dontAskAgain) onSkipConfirmChange(true)
    onReset()
  }

  const triggerClassName =
    "flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-destructive"

  if (skipConfirm) {
    return (
      <button
        type="button"
        onClick={onReset}
        aria-label="Reset conversation"
        className={triggerClassName}
      >
        <Trash2 className="size-3.5" />
      </button>
    )
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <button
            type="button"
            aria-label="Reset conversation"
            className={triggerClassName}
          >
            <Trash2 className="size-3.5" />
          </button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end">
          <Popover.Popup className="z-50 w-60 border border-border bg-popover p-3 shadow-md">
            <p className="text-sm">Reset the conversation?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Everything here goes back to the start.
            </p>

            <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(event) => setDontAskAgain(event.target.checked)}
                className="size-3.5 shrink-0 appearance-none border border-border bg-background checked:border-foreground checked:bg-foreground"
              />
              Don&apos;t ask me again
            </label>

            <div className="mt-3 flex justify-end gap-2">
              <Popover.Close className="px-2 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground">
                Cancel
              </Popover.Close>
              <Popover.Close
                onClick={confirm}
                className="bg-destructive px-2 py-1 text-xs text-white transition-opacity duration-150 hover:opacity-90"
              >
                Reset
              </Popover.Close>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
