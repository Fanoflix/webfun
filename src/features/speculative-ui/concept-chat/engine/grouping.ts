import { startOfDay } from "./time"
import type { Message, ThreadItem } from "./types"

/**
 * Collapses a flat message list into what the view renders: runs of consecutive
 * messages by one author, with date dividers interleaved.
 *
 * Pure and total — the view never groups, never sorts, and never decides where a
 * divider goes. That keeps the entire "what does this thread look like" question
 * in one testable function.
 */

/** How long a gap can be before the same author starts a new run. */
export const GROUP_WINDOW_MS = 5 * 60_000

export function groupThread(messages: Message[]): ThreadItem[] {
  const items: ThreadItem[] = []
  let currentDay: number | null = null
  let openGroup: Extract<ThreadItem, { kind: "group" }> | null = null

  for (const message of messages) {
    const day = startOfDay(message.sentAt)

    // A new day always closes the open run — a group must never straddle the
    // divider that gets drawn between its own messages.
    if (day !== currentDay) {
      items.push({ kind: "divider", id: `divider:${day}`, dayStart: day })
      currentDay = day
      openGroup = null
    }

    const continues =
      openGroup !== null &&
      openGroup.authorId === message.authorId &&
      message.sentAt - lastSentAt(openGroup) <= GROUP_WINDOW_MS

    if (continues && openGroup) {
      openGroup.messages.push(message)
      continue
    }

    openGroup = {
      kind: "group",
      // Keyed off the run's first message, so the key is stable as the run grows.
      id: `group:${message.id}`,
      authorId: message.authorId,
      startedAt: message.sentAt,
      messages: [message],
    }
    items.push(openGroup)
  }

  return items
}

/**
 * The gap is measured from the *previous message*, not the run's start — so a
 * steady back-and-forth stays one group instead of splitting every five minutes.
 */
function lastSentAt(group: Extract<ThreadItem, { kind: "group" }>): number {
  return group.messages[group.messages.length - 1].sentAt
}
