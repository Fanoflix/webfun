import { describe, expect, it } from "vitest"

import { GROUP_WINDOW_MS, groupThread } from "./grouping"
import { MINUTE_MS } from "./time"
import type { Message, ThreadItem } from "./types"

const NOW = new Date(2026, 2, 12, 14, 0, 0).getTime()

function msg(id: string, authorId: string, sentAt: number): Message {
  return {
    id,
    authorId,
    sentAt,
    body: [{ kind: "text", text: id }],
    reactions: [],
  }
}

function groups(items: ThreadItem[]) {
  return items.filter((i) => i.kind === "group")
}

function dividers(items: ThreadItem[]) {
  return items.filter((i) => i.kind === "divider")
}

describe("groupThread", () => {
  it("returns nothing for an empty thread", () => {
    expect(groupThread([])).toEqual([])
  })

  it("opens with a divider before the first message", () => {
    const items = groupThread([msg("a", "x", NOW)])
    expect(items[0].kind).toBe("divider")
  })

  it("collapses consecutive messages from one author", () => {
    const items = groupThread([
      msg("a", "x", NOW),
      msg("b", "x", NOW + 1_000),
      msg("c", "x", NOW + 2_000),
    ])
    expect(groups(items)).toHaveLength(1)
    expect(groups(items)[0].messages).toHaveLength(3)
  })

  it("starts a new group when the author changes", () => {
    const items = groupThread([
      msg("a", "x", NOW),
      msg("b", "y", NOW + 1_000),
      msg("c", "x", NOW + 2_000),
    ])
    expect(groups(items)).toHaveLength(3)
  })

  it("keeps the run open right up to the window edge", () => {
    const items = groupThread([
      msg("a", "x", NOW),
      msg("b", "x", NOW + GROUP_WINDOW_MS),
    ])
    expect(groups(items)).toHaveLength(1)
  })

  it("splits one millisecond past the window", () => {
    const items = groupThread([
      msg("a", "x", NOW),
      msg("b", "x", NOW + GROUP_WINDOW_MS + 1),
    ])
    expect(groups(items)).toHaveLength(2)
  })

  it("measures the gap from the previous message, not the group start", () => {
    // A steady drip every 4 minutes spans 12 minutes total but never leaves a
    // 5-minute gap, so it must stay one group.
    const items = groupThread([
      msg("a", "x", NOW),
      msg("b", "x", NOW + 4 * MINUTE_MS),
      msg("c", "x", NOW + 8 * MINUTE_MS),
      msg("d", "x", NOW + 12 * MINUTE_MS),
    ])
    expect(groups(items)).toHaveLength(1)
    expect(groups(items)[0].messages).toHaveLength(4)
  })

  it("emits one divider per day", () => {
    const yesterday = new Date(2026, 2, 11, 9, 0).getTime()
    const items = groupThread([
      msg("a", "x", yesterday),
      msg("b", "x", yesterday + 1_000),
      msg("c", "x", NOW),
    ])
    expect(dividers(items)).toHaveLength(2)
  })

  it("never lets a group straddle a date divider", () => {
    // Two minutes apart — inside the group window — but across midnight.
    const beforeMidnight = new Date(2026, 2, 11, 23, 59).getTime()
    const afterMidnight = new Date(2026, 2, 12, 0, 1).getTime()
    const items = groupThread([
      msg("a", "x", beforeMidnight),
      msg("b", "x", afterMidnight),
    ])
    expect(groups(items)).toHaveLength(2)
    // divider, group, divider, group
    expect(items.map((i) => i.kind)).toEqual([
      "divider",
      "group",
      "divider",
      "group",
    ])
  })

  it("keys a group off its first message so the key survives the run growing", () => {
    const one = groupThread([msg("a", "x", NOW)])
    const two = groupThread([msg("a", "x", NOW), msg("b", "x", NOW + 1_000)])
    expect(groups(one)[0].id).toBe(groups(two)[0].id)
  })
})
