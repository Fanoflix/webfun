import { SmilePlus } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import { CHAT_EASE } from "../engine/defaults"
import { formatRelative } from "../engine/time"
import type { Author, Message } from "../engine/types"
import { EmojiPicker } from "./EmojiPicker"
import { Reactions } from "./Reactions"
import { SegmentView } from "./SegmentView"

/**
 * A run of consecutive messages from one author: avatar and name once at the top,
 * then the messages under it. Grouping itself is decided in `grouping.ts` — this
 * only draws the result.
 *
 * The visitor's own messages look identical to everyone else's. No bubbles, no
 * side-switching; the thread reads as one column, which is what Slack and Discord
 * do and what keeps this minimal.
 */

export function MessageGroup({
  author,
  startedAt,
  messages,
  now,
  mountedAt,
  onToggleReaction,
}: {
  author: Author
  startedAt: number
  messages: Message[]
  now: number
  /** Messages older than this were already here on load — see `MessageRow`. */
  mountedAt: number
  onToggleReaction: (messageId: string, emoji: string) => void
}) {
  return (
    <div className="flex gap-3 px-4 py-1">
      <img
        src={author.avatarUrl}
        alt=""
        className="mt-0.5 size-9 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">{author.name}</span>
          <span className="text-[11px] text-muted-foreground">
            {formatRelative(startedAt, now)}
          </span>
        </div>
        {messages.map((message) => (
          <MessageRow
            key={message.id}
            message={message}
            isNew={message.sentAt > mountedAt}
            onToggleReaction={onToggleReaction}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * **Animation 1.** A new message grows in from zero height over 0.25s, expo
 * out — which pushes the thread above it upward rather than fading anything.
 *
 * Only messages that arrive *after* load animate. Without that guard the entire
 * seeded history unfurls from zero height on every reload, and — worse — the
 * scroll-to-bottom runs while the thread is still collapsed, so it lands at the
 * top and stays there.
 *
 * The test is `sentAt > mountedAt` rather than a set of known ids, because it
 * also gets the reset case right for free: a fresh seed is written with
 * timestamps in the past, so it appears without animating, exactly like a reload.
 */
function MessageRow({
  message,
  isNew,
  onToggleReaction,
}: {
  message: Message
  isNew: boolean
  onToggleReaction: (messageId: string, emoji: string) => void
}) {
  const reduced = useReducedMotion()
  const animates = isNew && !reduced

  return (
    <motion.div
      data-slot="message"
      data-new={isNew || undefined}
      initial={animates ? { height: 0 } : false}
      animate={{ height: "auto" }}
      transition={animates ? { duration: 0.25, ease: CHAT_EASE } : { duration: 0 }}
      className="group/message relative overflow-hidden"
    >
      <div className="space-y-1 pr-8">
        {message.body.map((segment, i) => (
          <SegmentView key={i} segment={segment} />
        ))}
        <Reactions
          reactions={message.reactions}
          onToggle={(emoji) => onToggleReaction(message.id, emoji)}
        />
      </div>

      <EmojiPicker
        onPick={(emoji) => onToggleReaction(message.id, emoji)}
        trigger={
          <button
            type="button"
            aria-label="Add reaction"
            className="absolute top-0 right-0 flex size-7 items-center justify-center border border-border bg-background text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/message:opacity-100 hover:text-foreground focus-visible:opacity-100"
          >
            <SmilePlus className="size-3.5" />
          </button>
        }
      />
    </motion.div>
  )
}
