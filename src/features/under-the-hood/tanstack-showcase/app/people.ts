/**
 * The handful of people in the demo.
 *
 * Stored lowercase because that's what reads like an account handle in data,
 * and capitalised only for display — so the same value can key an avatar, sit
 * in a ticket record, and still render as a name.
 */
export const PEOPLE = ["sam", "ada", "kit"] as const

/**
 * Whoever is "signed in" to the fake app.
 *
 * A support tool files an issue as *you* — picking the author from a dropdown is
 * something no real tracker asks for, and it put a control in the composer that
 * had nothing to do with what this entry is demonstrating.
 */
export const CURRENT_USER = PEOPLE[0]

export const displayName = (handle: string) =>
  handle.charAt(0).toUpperCase() + handle.slice(1)
