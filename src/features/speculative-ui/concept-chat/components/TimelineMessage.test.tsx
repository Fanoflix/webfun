// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_BEAT_ENTER } from "../engine/defaults"
import type { Message, Segment } from "../engine/types"
import { TimelineMessage } from "./TimelineMessage"

/**
 * Behavioural: what's on screen before, during and after a play. The point of
 * beats accumulating is that nothing ever leaves, so most of these assert that
 * earlier lines are *still there*.
 */

const beat = (text: string, hold: number): Segment => ({
  kind: "text",
  text,
  timing: { hold, enter: DEFAULT_BEAT_ENTER },
})

const message: Message = {
  id: "m1",
  authorId: "chatter",
  sentAt: 0,
  mode: "timeline",
  reactions: [],
  body: [beat("one", 1_000), beat("two", 1_000), beat("three", 0)],
}

function renderMessage(overrides: Partial<Message> = {}) {
  const onFinish = vi.fn()
  const onBeatLand = vi.fn()
  render(
    <TimelineMessage
      message={{ ...message, ...overrides }}
      onFinish={onFinish}
      onBeatLand={onBeatLand}
    />
  )
  return { onFinish, onBeatLand }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("TimelineMessage", () => {
  it("shows only the first beat, as a poster", () => {
    renderMessage()

    expect(screen.getByText("one")).toBeTruthy()
    expect(screen.queryByText("two")).toBeNull()
  })

  it("says what it is, and how long it runs for", () => {
    renderMessage()

    expect(screen.getByRole("button", { name: "Play message" })).toBeTruthy()
    expect(screen.getByText("This message is playable")).toBeTruthy()
    expect(screen.getByText("0:02")).toBeTruthy()
  })

  it("keeps replay visible rather than hiding it behind a hover", () => {
    renderMessage({ played: true })

    const replay = screen.getByRole("button", { name: "Replay" })
    expect(replay.className).not.toMatch(/opacity-0/)
  })

  it("runs an indeterminate bar only while beats are landing", () => {
    renderMessage()
    const bar = () => document.querySelector('[data-slot="playing-bar"]')

    expect(bar()).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Play message" }))
    expect(bar()).not.toBeNull()

    act(() => void vi.advanceTimersByTime(5_000))
    expect(bar()).toBeNull()
  })

  it("marks itself as playable for as long as it exists", () => {
    // Idle, playing and rested all keep the gutter rail — a played message
    // should stay visibly different from the plain text around it.
    renderMessage()
    const rail = () => document.querySelector('[data-slot="timeline-message"]')

    expect(rail()).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Play message" }))
    expect(rail()).not.toBeNull()
    act(() => void vi.advanceTimersByTime(5_000))
    expect(rail()).not.toBeNull()
  })

  it("does not autoplay — nothing moves until it's pressed", () => {
    renderMessage()

    act(() => void vi.advanceTimersByTime(10_000))

    expect(screen.queryByText("two")).toBeNull()
  })

  it("lands each beat in turn, keeping the ones before it", () => {
    renderMessage()

    fireEvent.click(screen.getByRole("button", { name: "Play message" }))
    act(() => void vi.advanceTimersByTime(1_000))

    expect(screen.getByText("one")).toBeTruthy()
    expect(screen.getByText("two")).toBeTruthy()
    expect(screen.queryByText("three")).toBeNull()

    act(() => void vi.advanceTimersByTime(1_000))

    expect(screen.getByText("one")).toBeTruthy()
    expect(screen.getByText("three")).toBeTruthy()
  })

  it("reports the end once, so the thread can remember it", () => {
    const { onFinish } = renderMessage()

    fireEvent.click(screen.getByRole("button", { name: "Play message" }))
    act(() => void vi.advanceTimersByTime(5_000))

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith("m1")
  })

  it("reports every landing, so the thread can stay scrolled", () => {
    const { onBeatLand } = renderMessage()

    fireEvent.click(screen.getByRole("button", { name: "Play message" }))
    act(() => void vi.advanceTimersByTime(5_000))

    expect(onBeatLand).toHaveBeenCalledTimes(3)
  })

  it("swaps play for replay once it's finished", () => {
    renderMessage()

    fireEvent.click(screen.getByRole("button", { name: "Play message" }))
    act(() => void vi.advanceTimersByTime(5_000))

    expect(screen.queryByRole("button", { name: "Play message" })).toBeNull()
    expect(screen.getByRole("button", { name: "Replay" })).toBeTruthy()
  })

  it("rewinds to the poster on replay", () => {
    renderMessage()

    fireEvent.click(screen.getByRole("button", { name: "Play message" }))
    act(() => void vi.advanceTimersByTime(5_000))
    fireEvent.click(screen.getByRole("button", { name: "Replay" }))

    expect(screen.queryByText("three")).toBeNull()

    act(() => void vi.advanceTimersByTime(2_000))

    expect(screen.getByText("three")).toBeTruthy()
  })

  it("comes back finished when it has already been played", () => {
    renderMessage({ played: true })

    expect(screen.getByText("three")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Play message" })).toBeNull()
  })

  it("plays a one-beat message instantly rather than waiting on nothing", () => {
    const { onFinish } = renderMessage({ body: [beat("only", 1_000)] })

    fireEvent.click(screen.getByRole("button", { name: "Play message" }))

    expect(onFinish).toHaveBeenCalledWith("m1")
    expect(screen.getByRole("button", { name: "Replay" })).toBeTruthy()
  })

  it("times beats from the start, so late timers don't accumulate drift", () => {
    renderMessage()

    fireEvent.click(screen.getByRole("button", { name: "Play message" }))
    // A beat that lands late must not push the next one out with it.
    act(() => void vi.advanceTimersByTime(1_900))
    expect(screen.queryByText("three")).toBeNull()
    act(() => void vi.advanceTimersByTime(100))
    expect(screen.getByText("three")).toBeTruthy()
  })
})
