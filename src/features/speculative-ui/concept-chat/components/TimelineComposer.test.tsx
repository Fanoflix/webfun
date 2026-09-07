// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ChatFrame } from "./ChatFrame"

/**
 * The authoring flow, driven the way a person drives it: press the button, type,
 * press Enter, send. Asserted against the real engine and the real thread, so a
 * passing run means a timeline message actually arrives playable.
 */

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function input(): HTMLTextAreaElement {
  const el = screen.getByRole("textbox")
  if (!(el instanceof HTMLTextAreaElement)) throw new Error("no composer")
  return el
}

function type(value: string) {
  fireEvent.change(input(), { target: { value } })
}

function pressEnter() {
  fireEvent.keyDown(input(), { key: "Enter", shiftKey: false })
}

function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }))
}

function enableTimeline() {
  click("Compose a timeline message")
}

describe("timeline composing", () => {
  it("is off by default — the composer is a plain composer", () => {
    render(<ChatFrame />)

    expect(screen.queryByText("Timeline")).toBeNull()
  })

  it("puts the caret in the editor as it opens", () => {
    render(<ChatFrame />)
    enableTimeline()

    expect(document.activeElement).toBe(input())
  })

  it("opens with one beat, carrying whatever was already typed", () => {
    render(<ChatFrame />)
    type("ok hear me out")
    enableTimeline()

    expect(screen.getByText("Timeline")).toBeTruthy()
    expect(screen.getByText(/beat 1 of 1/)).toBeTruthy()
    expect(input().value).toBe("ok hear me out")
  })

  it("makes Enter start the next beat instead of sending", () => {
    render(<ChatFrame />)
    type("beat one")
    enableTimeline()
    pressEnter()

    expect(screen.getByText(/beat 2 of 2/)).toBeTruthy()
    expect(input().value).toBe("")
    // Nothing has been sent — the thread is untouched.
    expect(screen.queryAllByText("beat one").length).toBe(1) // the beat card only
  })

  it("swaps a beat back into the editor when it's selected", () => {
    render(<ChatFrame />)
    type("first")
    enableTimeline()
    pressEnter()
    type("second")

    click("Beat 1")
    expect(input().value).toBe("first")

    click("Beat 2")
    expect(input().value).toBe("second")
  })

  it("cycles the hold through the presets, showing the real number", () => {
    render(<ChatFrame />)
    type("first")
    enableTimeline()
    pressEnter()

    expect(screen.getByText("Normal")).toBeTruthy()
    expect(screen.getByText("1.5s")).toBeTruthy()

    click("Hold for beat 1")

    expect(screen.getByText("Long")).toBeTruthy()
    expect(screen.getByText("3s")).toBeTruthy()
  })

  it("gives the last beat no hold — nothing follows it", () => {
    render(<ChatFrame />)
    type("first")
    enableTimeline()
    pressEnter()

    const last = screen.getByRole("button", { name: "Hold for beat 2" })
    expect(last.hasAttribute("disabled")).toBe(true)
    expect(screen.getByText("end")).toBeTruthy()
  })

  it("reorders beats, and the selection follows the beat it was on", () => {
    render(<ChatFrame />)
    type("first")
    enableTimeline()
    pressEnter()
    type("second")

    // Editing beat 2; moving it earlier should leave it still being edited.
    click("Move beat earlier")

    expect(screen.getByText(/beat 1 of 2/)).toBeTruthy()
    expect(input().value).toBe("second")
  })

  it("sends a message that arrives playable rather than pre-read", () => {
    render(<ChatFrame />)
    const playablesBefore = screen.getAllByRole("button", {
      name: "Play message",
    }).length

    type("beat one")
    enableTimeline()
    pressEnter()
    type("this")
    click("Send message")

    expect(
      screen.getAllByRole("button", { name: "Play message" })
    ).toHaveLength(playablesBefore + 1)
    // The last beat is not on screen until it's played.
    expect(screen.queryByText("this")).toBeNull()
  })

  it("plays the sent message through to the end", () => {
    render(<ChatFrame />)
    type("beat one")
    enableTimeline()
    pressEnter()
    type("this")
    click("Send message")

    const plays = screen.getAllByRole("button", { name: "Play message" })
    fireEvent.click(plays[plays.length - 1])
    act(() => void vi.advanceTimersByTime(2_000))

    expect(screen.getByText("this")).toBeTruthy()
  })

  it("returns to a plain composer on exit, keeping the draft", () => {
    render(<ChatFrame />)
    type("never mind")
    enableTimeline()
    click("Leave timeline mode")

    expect(screen.queryByText("Timeline")).toBeNull()
    expect(input().value).toBe("never mind")
  })

  it("leaves timeline mode when the last beat is deleted", () => {
    render(<ChatFrame />)
    type("gone")
    enableTimeline()
    click("Delete beat")

    expect(screen.queryByText("Timeline")).toBeNull()
    expect(input().value).toBe("")
  })

  it("previews with the same component the recipient gets", () => {
    render(<ChatFrame />)
    type("beat one")
    enableTimeline()
    pressEnter()
    type("this")

    const before = screen.getAllByRole("button", {
      name: "Play message",
    }).length
    click("Preview")

    expect(
      screen.getAllByRole("button", { name: "Play message" })
    ).toHaveLength(before + 1)
  })
})
