import { describe, expect, it } from "vitest"

import {
  DAY_MS,
  HOUR_MS,
  MINUTE_MS,
  daysBetween,
  formatDayLabel,
  formatRelative,
  formatCountdown,
  startOfDay,
} from "./time"

/** A fixed local-time anchor: 2026-03-12, 14:00. */
const NOW = new Date(2026, 2, 12, 14, 0, 0).getTime()

describe("startOfDay", () => {
  it("floors to local midnight", () => {
    expect(new Date(startOfDay(NOW)).getHours()).toBe(0)
    expect(startOfDay(NOW)).toBe(new Date(2026, 2, 12).getTime())
  })

  it("is idempotent", () => {
    expect(startOfDay(startOfDay(NOW))).toBe(startOfDay(NOW))
  })
})

describe("daysBetween", () => {
  it("counts calendar days, not elapsed hours", () => {
    // 23:30 → 00:30 is one hour but a different day.
    const lateNight = new Date(2026, 2, 11, 23, 30).getTime()
    const justAfterMidnight = new Date(2026, 2, 12, 0, 30).getTime()
    expect(daysBetween(lateNight, justAfterMidnight)).toBe(1)
  })

  it("is zero within a day", () => {
    expect(daysBetween(NOW - HOUR_MS, NOW)).toBe(0)
  })
})

describe("formatRelative", () => {
  it("says 'Just now' under a minute", () => {
    expect(formatRelative(NOW, NOW)).toBe("Just now")
    expect(formatRelative(NOW - 59_000, NOW)).toBe("Just now")
  })

  it("switches to minutes at exactly one minute", () => {
    expect(formatRelative(NOW - MINUTE_MS, NOW)).toBe("1m")
    expect(formatRelative(NOW - 5 * MINUTE_MS, NOW)).toBe("5m")
    expect(formatRelative(NOW - 59 * MINUTE_MS, NOW)).toBe("59m")
  })

  it("switches to hours at exactly one hour", () => {
    expect(formatRelative(NOW - HOUR_MS, NOW)).toBe("1h")
    expect(formatRelative(NOW - 3 * HOUR_MS, NOW)).toBe("3h")
  })

  it("prefers 'Yesterday' over an hour count once the day flips", () => {
    // 20h earlier is still an hour count only if it's the same calendar day;
    // from 14:00 it lands on the previous day, so the label must change.
    expect(formatRelative(NOW - 20 * HOUR_MS, NOW)).toBe("Yesterday")
  })

  it("falls back to a date beyond yesterday", () => {
    const label = formatRelative(NOW - 4 * DAY_MS, NOW)
    expect(label).not.toBe("Yesterday")
    expect(label).toMatch(/8/)
  })

  it("clamps future timestamps instead of going negative", () => {
    expect(formatRelative(NOW + 5 * MINUTE_MS, NOW)).toBe("Just now")
  })
})

describe("formatDayLabel", () => {
  it("names today and yesterday", () => {
    expect(formatDayLabel(startOfDay(NOW), NOW)).toBe("Today")
    expect(formatDayLabel(startOfDay(NOW - DAY_MS), NOW)).toBe("Yesterday")
  })

  it("dates anything older", () => {
    expect(formatDayLabel(startOfDay(NOW - 3 * DAY_MS), NOW)).toMatch(/9/)
  })
})

describe("formatCountdown", () => {
  it("formats minutes and zero-padded seconds", () => {
    expect(formatCountdown(10 * MINUTE_MS)).toBe("10:00")
    expect(formatCountdown(9 * MINUTE_MS + 5_000)).toBe("9:05")
    expect(formatCountdown(59_000)).toBe("0:59")
  })

  it("rounds up, so a fresh 10-minute timer never reads 9:59", () => {
    expect(formatCountdown(10 * MINUTE_MS - 1)).toBe("10:00")
  })

  it("clamps at zero instead of going negative", () => {
    expect(formatCountdown(0)).toBe("0:00")
    expect(formatCountdown(-5_000)).toBe("0:00")
  })
})
