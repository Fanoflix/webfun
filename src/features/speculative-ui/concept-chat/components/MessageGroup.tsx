import { SmilePlus } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import { isTimeline } from "../engine/beats"
import { CHAT_EASE } from "../engine/defaults"
import { formatRelative } from "../engine/time"
import type { Author, Message } from "../engine/types"
import { EmojiPicker } from "./EmojiPicker"
import { Reactions } from "./Reactions"
import { SegmentView } from "./SegmentView"
import { TimelineMessage } from "./TimelineMessage"

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
  onPlayed,
  onBeatLand,
}: {
  author: Author
  startedAt: number
  messages: Message[]
  now: number
  /** Messages older than this were already here on load — see `MessageRow`. */
  mountedAt: number
  onToggleReaction: (messageId: string, emoji: string) => void
  onPlayed: (messageId: string) => void
  onBeatLand: () => void
}) {
  return (
    <div className="py-1">
      {messages.map((message, index) => (
        <MessageRow
          key={message.id}
          message={message}
          author={author}
          startedAt={startedAt}
          now={now}
          /**
           * The avatar and name belong to the run, but they're rendered *inside*
           * its first message rather than above the run. Otherwise the hover
           * highlight starts below them and cuts the avatar in half — the header
           * is part of that first message, so it has to be part of its row.
           */
          leads={index === 0}
          isNew={message.sentAt > mountedAt}
          onToggleReaction={onToggleReaction}
          onPlayed={onPlayed}
          onBeatLand={onBeatLand}
        />
      ))}
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
 *
 * Hovering tints the row, which is the only thing that ever says where one
 * message ends and the next begins — a run of messages from one author has no
 * dividers and no repeated avatar by design. So the row owns the full width of
 * the thread, avatar gutter included, and the leading message of a run owns the
 * header too: a tint that started below the name would cut the avatar in half.
 *
 * Messages after the first get an empty gutter of the same width, which is what
 * keeps a run's text in one column.
 */
function MessageRow({
  message,
  author,
  startedAt,
  now,
  leads,
  isNew,
  onToggleReaction,
  onPlayed,
  onBeatLand,
}: {
  message: Message
  author: Author
  startedAt: number
  now: number
  /** Whether this message opens its run, and so carries the avatar and name. */
  leads: boolean
  isNew: boolean
  onToggleReaction: (messageId: string, emoji: string) => void
  onPlayed: (messageId: string) => void
  onBeatLand: () => void
}) {
  const reduced = useReducedMotion()
  const animates = isNew && !reduced

  return (
    <motion.div
      data-slot="message"
      data-new={isNew || undefined}
      initial={animates ? { height: 0 } : false}
      animate={{ height: "auto" }}
      transition={
        animates ? { duration: 0.25, ease: CHAT_EASE } : { duration: 0 }
      }
      className="group/message relative flex gap-3 overflow-hidden px-4 py-1 transition-colors duration-100 hover:bg-muted/40"
    >
      {leads ? (
        <img
          src={author.avatarUrl}
          alt=""
          className="mt-0.5 size-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div aria-hidden className="w-9 shrink-0" />
      )}

      <div className="min-w-0 flex-1 space-y-1 pr-8">
        {leads && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">{author.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {formatRelative(startedAt, now)}
            </span>
          </div>
        )}
        {isTimeline(message) ? (
          <TimelineMessage
            message={message}
            onFinish={onPlayed}
            onBeatLand={onBeatLand}
          />
        ) : (
          message.body.map((segment, i) => (
            <SegmentView key={i} segment={segment} />
          ))
        )}
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
            className="absolute top-1 right-2 flex size-6 items-center justify-center border border-border bg-background text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/message:opacity-100 hover:text-foreground focus-visible:opacity-100"
          >
            <SmilePlus className="size-3.5" />
          </button>
        }
      />
    </motion.div>
  )
}
