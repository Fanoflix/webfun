// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { TicketDetail } from "./TicketDetail"

const noop = () => {}

afterEach(cleanup)

describe("TicketDetail when the ticket is gone", () => {
  /**
   * The reported bug: deleting the open ticket left this pane on its loading
   * skeleton forever, because "ready but no ticket" and "errored" both fell
   * through to the loading branch.
   */
  it("says so instead of loading forever", () => {
    render(
      <TicketDetail
        ticket={undefined}
        state="error"
        isMutating={false}
        onStatus={noop}
        onDelete={noop}
      />
    )

    expect(screen.getByText(/isn't there any more/i)).toBeDefined()
  })

  it("does the same when the read succeeded but found nothing", () => {
    render(
      <TicketDetail
        ticket={undefined}
        state="ready"
        isMutating={false}
        onStatus={noop}
        onDelete={noop}
      />
    )

    expect(screen.getByText(/isn't there any more/i)).toBeDefined()
  })
})
