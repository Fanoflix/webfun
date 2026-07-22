// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  CHATTER,
  REPLAY_BEAT_MS,
  REPLAY_BURST_TYPING_MS,
  REPLAY_FIRST_TYPING_MS,
  THREAD_TTL_MS,
  VIEWER,
} from "../engine/defaults"
import { ChatFrame } from "./ChatFrame"

/**
 * Renders the real component tree against the real engine — the closest thing to
 * driving the page without a browser. Deliberately behavioural: what a person
 * sees and what happens when they type, not implementation detail.
 */

beforeEach(() => {
  // Both the thread and the reset preference live here.
  window.localStorage.clear()
})

afterEach(cleanup)

function composer(): HTMLTextAreaElement {
  return screen.getByPlaceholderText(`Message ${CHATTER.name}`)
}

function type(value: string) {
  fireEvent.change(composer(), { target: { value } })
}

function pressEnter(options: { shift?: boolean } = {}) {
  fireEvent.keyDown(composer(), {
    key: "Enter",
    shiftKey: options.shift ?? false,
  })
}

describe("ChatFrame", () => {
  it("renders the seeded conversation on a first visit", () => {
    render(<ChatFrame />)
    expect(screen.getByText(/hear me out/i)).toBeTruthy()
    expect(screen.getByText(/knew how it was supposed/i)).toBeTruthy()
  })

  it("shows a single date divider for a same-day seed", () => {
    render(<ChatFrame />)
    expect(screen.getAllByText("Today")).toHaveLength(1)
  })

  it("groups the seeded run under one author header", () => {
    render(<ChatFrame />)
    // The rail also shows the name, so scope to the thread: one header in the
    // message list, not one per message.
    expect(screen.getAllByText(CHATTER.name).length).toBeLessThanOrEqual(3)
  })

  it("sends on Enter and shows the message", () => {
    render(<ChatFrame />)
    type("this is my message")
    pressEnter()

    expect(screen.getByText("this is my message")).toBeTruthy()
    expect(composer().value).toBe("")
  })

  it("does not send on Shift+Enter", () => {
    render(<ChatFrame />)
    type("still typing")
    pressEnter({ shift: true })

    // The draft survives, because the newline is the point.
    expect(composer().value).toBe("still typing")
  })

  it("refuses to send whitespace", () => {
    render(<ChatFrame />)
    const before = screen.getAllByText(/./).length
    type("   ")
    pressEnter()
    expect(composer().value).toBe("   ")
    expect(screen.getAllByText(/./).length).toBe(before)
  })

  it("attributes a sent message to the visitor", () => {
    render(<ChatFrame />)
    type("mine")
    pressEnter()
    expect(screen.getAllByText(VIEWER.name).length).toBeGreaterThan(0)
  })

  it("persists across a remount", () => {
    const first = render(<ChatFrame />)
    type("remember me")
    pressEnter()
    first.unmount()

    render(<ChatFrame />)
    expect(screen.getByText("remember me")).toBeTruthy()
  })

  it("empties the thread when reset is confirmed, then types the seed back in", () => {
    vi.useFakeTimers()
    try {
      render(<ChatFrame />)
      type("temporary")
      pressEnter()
      expect(screen.getByText("temporary")).toBeTruthy()

      fireEvent.click(screen.getByLabelText("Reset conversation"))
      fireEvent.click(screen.getByRole("button", { name: "Reset" }))

      // The thread empties immediately and the counterpart starts typing — the
      // seed is performed, not restored.
      expect(screen.queryByText("temporary")).toBeNull()
      expect(screen.queryByText(/hear me out/i)).toBeNull()
      expect(screen.getByText(`${CHATTER.name} is typing`)).toBeTruthy()

      act(() => void vi.advanceTimersByTime(REPLAY_FIRST_TYPING_MS))
      expect(screen.getByText(/hear me out/i)).toBeTruthy()

      // And it keeps going rather than stopping at the first line — the next
      // three arrive in a quick burst.
      act(() => void vi.advanceTimersByTime(REPLAY_BEAT_MS + REPLAY_BURST_TYPING_MS))
      expect(screen.getByText(/timing is the entire joke/i)).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it("discards the conversation once its lifetime runs out", () => {
    vi.useFakeTimers()
    try {
      render(<ChatFrame />)
      type("this should not outlive the timer")
      pressEnter()
      expect(screen.getByText("this should not outlive the timer")).toBeTruthy()

      act(() => void vi.advanceTimersByTime(THREAD_TTL_MS))
      expect(screen.queryByText("this should not outlive the timer")).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it("does not restore a thread that expired while the tab was closed", () => {
    // The live timer can't help here — it never ran. Expiry has to be enforced
    // on read too, or reopening a tab days later restores a stale conversation.
    const first = render(<ChatFrame />)
    type("stale")
    pressEnter()
    first.unmount()

    const realNow = Date.now
    try {
      Date.now = () => realNow() + THREAD_TTL_MS + 1_000
      render(<ChatFrame />)
      expect(screen.queryByText("stale")).toBeNull()
    } finally {
      Date.now = realNow
    }
  })

  it("pushes expiry back when the timer is restarted", () => {
    vi.useFakeTimers()
    try {
      render(<ChatFrame />)
      type("keep me")
      pressEnter()

      // Most of the way to expiry, then restart the clock.
      act(() => void vi.advanceTimersByTime(THREAD_TTL_MS - 5_000))
      fireEvent.click(screen.getByLabelText("Restart the reset timer"))

      // Past where the original expiry would have been.
      act(() => void vi.advanceTimersByTime(10_000))
      expect(screen.getByText("keep me")).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it("keeps the dialog open while 'don't ask me again' is being ticked", () => {
    // Committing the preference on change would flip the button to its
    // no-confirm variant and tear the dialog away mid-decision.
    render(<ChatFrame />)
    fireEvent.click(screen.getByLabelText("Reset conversation"))
    fireEvent.click(screen.getByLabelText(/ask me again/i))

    expect(screen.getByText("Reset the conversation?")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy()
  })

  it("does not remember the preference if the reset is cancelled", () => {
    const first = render(<ChatFrame />)
    fireEvent.click(screen.getByLabelText("Reset conversation"))
    fireEvent.click(screen.getByLabelText(/ask me again/i))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    first.unmount()

    render(<ChatFrame />)
    fireEvent.click(screen.getByLabelText("Reset conversation"))
    expect(screen.getByText("Reset the conversation?")).toBeTruthy()
  })

  it("skips the confirmation once 'don't ask me again' is confirmed", () => {
    const first = render(<ChatFrame />)
    fireEvent.click(screen.getByLabelText("Reset conversation"))
    fireEvent.click(screen.getByLabelText(/ask me again/i))
    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    first.unmount()

    // The preference survives a reload, and the button now resets on one click.
    render(<ChatFrame />)
    type("gone in one click")
    pressEnter()
    fireEvent.click(screen.getByLabelText("Reset conversation"))

    expect(screen.queryByText("Reset the conversation?")).toBeNull()
    expect(screen.queryByText("gone in one click")).toBeNull()
  })

  it("keeps the typing indicator out of the scrolling thread", () => {
    // Inline, it inserted and removed a row on every exchange and shoved the
    // conversation around. It belongs below the composer, outside the scroller.
    vi.useFakeTimers()
    try {
      render(<ChatFrame />)
      fireEvent.click(screen.getByLabelText("Reset conversation"))
      fireEvent.click(screen.getByRole("button", { name: "Reset" }))

      const indicator = screen.getByText(`${CHATTER.name} is typing`)
      const thread = document.querySelector("[data-slot='thread']")
      expect(thread).not.toBeNull()
      expect(thread?.contains(indicator)).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it("renders emoji-only messages, and keeps ordinary text ordinary", () => {
    render(<ChatFrame />)
    type("🔥")
    pressEnter()
    const jumbo = screen.getByText("🔥")
    expect(jumbo.className).toContain("text-4xl")

    type("not emoji")
    pressEnter()
    expect(screen.getByText("not emoji").className).not.toContain("text-4xl")
  })

  // These two guard a specific failure: Base UI's `render` clones the trigger to
  // attach its handler and ref, so a wrapper component that doesn't forward props
  // yields a button that looks right and does nothing. Asserting the panel opens
  // is the only way to catch it.
  it("opens the emoji picker from the composer", () => {
    render(<ChatFrame />)
    expect(screen.queryByText("Smileys")).toBeNull()
    fireEvent.click(screen.getByLabelText("Insert emoji"))
    expect(screen.getByText("Smileys")).toBeTruthy()
  })

  it("opens the attach panel from the + button", () => {
    render(<ChatFrame />)
    expect(screen.queryByText("Images")).toBeNull()
    fireEvent.click(screen.getByLabelText("Add attachment"))
    expect(screen.getByText("Images")).toBeTruthy()
    expect(screen.getByText("Gifs")).toBeTruthy()
  })

  it("inserts a picked emoji into the draft", () => {
    render(<ChatFrame />)
    fireEvent.click(screen.getByLabelText("Insert emoji"))
    fireEvent.click(screen.getAllByText("🔥")[0])
    expect(composer().value).toContain("🔥")
  })

  it("attaches a picked image and sends it with the message", () => {
    render(<ChatFrame />)
    fireEvent.click(screen.getByLabelText("Add attachment"))
    fireEvent.click(screen.getByLabelText("teldrassil"))

    expect(screen.getByLabelText("Remove attachment")).toBeTruthy()
    type("look at this")
    pressEnter()

    expect(screen.getByText("look at this")).toBeTruthy()
    expect(screen.queryByLabelText("Remove attachment")).toBeNull()
  })

  it("adds a reaction through the picker and toggles it back off", () => {
    render(<ChatFrame />)
    type("react to me")
    pressEnter()

    const row = screen
      .getByText("react to me")
      .closest<HTMLElement>("[data-slot='message']")
    if (row === null) throw new Error("message row not found")

    fireEvent.click(within(row).getByLabelText("Add reaction"))
    fireEvent.click(screen.getAllByText("🔥")[0])

    const reaction = screen.getByRole("button", { name: /🔥 1/ })
    expect(reaction).toBeTruthy()

    // Clicking your own reaction removes it, which empties the row entirely.
    fireEvent.click(reaction)
    expect(screen.queryByRole("button", { name: /🔥 1/ })).toBeNull()
  })
})
