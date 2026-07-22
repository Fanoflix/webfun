import { Popover } from "@base-ui/react/popover"
import type { ReactElement } from "react"

import { EMOJI_GROUPS } from "../engine/emoji"

/**
 * The emoji grid, used both for composing and for reacting.
 *
 * Curated and searchless on purpose — a full emoji dataset is megabytes of JSON
 * and a search box nobody uses in a sixty-second demo.
 */
export function EmojiPicker({
  trigger,
  onPick,
}: {
  trigger: ReactElement
  onPick: (emoji: string) => void
}) {
  return (
    <Popover.Root>
      <Popover.Trigger render={trigger} />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end">
          <Popover.Popup className="z-50 max-h-72 w-72 overflow-y-auto border border-border bg-popover p-2 shadow-md">
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label} className="mb-2 last:mb-0">
                <p className="px-1 pb-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                  {group.label}
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {group.emoji.map((emoji) => (
                    <Popover.Close
                      key={emoji}
                      onClick={() => onPick(emoji)}
                      className="flex size-8 items-center justify-center text-lg transition-colors duration-150 hover:bg-accent"
                    >
                      {emoji}
                    </Popover.Close>
                  ))}
                </div>
              </div>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
