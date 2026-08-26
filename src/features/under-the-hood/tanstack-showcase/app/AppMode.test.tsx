// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AppMode } from "./AppMode"
import type { TicketsView } from "../rungs/contract"
import type { Ticket } from "../engine/types"

const ticket: Ticket = {
  id: 1,
  title: "Login redirect loops on Safari",
  status: "open",
  assignee: "sam",
  preview: "Only on Safari 17.",
  body: ["Only on Safari 17."],
  comments: [],
}

const view = (over: Partial<TicketsView> = {}): TicketsView => ({
  list: [ticket],
  listState: "ready",
  summary: ticket,
  detail: ticket,
  detailState: "ready",
  isMutating: false,
  error: null,
  create: () => {},
  setStatus: () => {},
  remove: async () => {},
  ...over,
})

/**
 * Tailwind isn't evaluated in jsdom, so which pane is on screen is asserted from
 * the classes. The panes carry `data-pane` for exactly this — a structural
 * selector would latch onto whichever wrapper happened to be nearest.
 */
const pane = (name: "inbox" | "detail") =>
  document.querySelector<HTMLElement>(`[data-pane="${name}"]`)

afterEach(cleanup)

describe("AppMode on a narrow screen", () => {
  /**
   * The inbox is a fixed 19rem. Side by side on a 390px screen that leaves the
   * detail about 80px, which is no pane at all — so below `lg` the two take
   * turns, and the classes are what decide which is on screen.
   */
  it("shows the inbox and hides the detail when nothing is selected", () => {
    render(
      <AppMode
        view={view({ detail: undefined, detailState: "idle" })}
        selectedId={null}
        onSelect={() => {}}
        onBack={() => {}}
        latestEvent={undefined}
      />
    )

    expect(pane("inbox")?.className).toContain("flex")
    expect(pane("inbox")?.className).not.toContain("hidden")
    // The detail steps aside until there's something to show in it.
    expect(pane("detail")?.className).toContain("hidden")
  })

  it("swaps to the detail once a ticket is open", () => {
    render(
      <AppMode
        view={view()}
        selectedId={1}
        onSelect={() => {}}
        onBack={() => {}}
        latestEvent={undefined}
      />
    )

    // The inbox steps aside below `lg` and comes back at `lg`, where there's
    // room for both.
    expect(pane("inbox")?.className).toContain("hidden")
    expect(pane("inbox")?.className).toContain("lg:flex")
    expect(pane("detail")?.className).toContain("block")
  })

  it("offers a way back, since the list is no longer on screen", async () => {
    const onBack = vi.fn()
    render(
      <AppMode
        view={view()}
        selectedId={1}
        onSelect={() => {}}
        onBack={onBack}
        latestEvent={undefined}
      />
    )

    const back = screen.getByLabelText("Back to inbox")
    expect(back.className).toContain("lg:hidden")

    back.click()
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
