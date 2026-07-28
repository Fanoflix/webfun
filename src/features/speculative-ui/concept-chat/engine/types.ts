/**
 * Concept chat's data model.
 *
 * The one decision everything else rests on: a message body is an ordered
 * `Segment[]`, never a string. v0 renders every segment at once. v1 hangs timing
 * onto each segment and adds a playback mode, so a "timeline message" reuses this
 * exact model and this exact renderer — it just walks a clock instead of emitting
 * everything immediately.
 *
 * The trap being avoided is the shape every real chat app uses — `content: string`
 * plus `attachments[]` — which forces a second, parallel representation the moment
 * a message needs to perform itself in order.
 */

import type { GifId, ImageId } from "./assets"
import type { BeatEnter } from "./beatEnters"

/** Re-exported so consumers get the whole message vocabulary from one module. */
export type { BeatEnter, GifId, ImageId }

/**
 * What makes a segment the start of a beat.
 *
 * `hold` is a gap, not a position: how long this beat sits on screen alone before
 * the next one lands beneath it. Relative rather than absolute so that inserting,
 * deleting or reordering a beat recomputes nothing downstream.
 *
 * The last beat's `hold` is never read — nothing follows it.
 */
export type Timing = {
  /** Milliseconds before the next beat arrives. */
  hold: number
  enter: BeatEnter
}

export type AuthorId = string
export type MessageId = string

/**
 * A piece of a message body. Discriminated on `kind` so the renderer is a total
 * switch and a new segment type is a compile error everywhere it matters.
 *
 * `timing` is what turns a flat body into beats: **a segment carrying timing starts
 * a new beat, and a segment without it joins the beat before**. That second half is
 * v0's behaviour unchanged — "show immediately and keep showing" — which is why a
 * message with no timing anywhere is exactly a static message, and why nothing
 * already written to storage needed migrating.
 *
 * It also gives text-plus-media beats for free: the text carries the timing, the
 * gif after it doesn't.
 *
 * Beats themselves are derived, never stored. See `beats.ts`.
 */
export type Segment =
  | { kind: "text"; text: string; timing?: Timing }
  | { kind: "image"; assetId: ImageId; timing?: Timing }
  | { kind: "gif"; assetId: GifId; timing?: Timing }

/**
 * One emoji's worth of reaction. `by` holds the authors who reacted, so the count
 * and "did I react?" both fall out of it — no separate tally to keep in sync.
 */
export type Reaction = {
  emoji: string
  by: AuthorId[]
}

export type Message = {
  id: MessageId
  authorId: AuthorId
  /** Epoch ms. Drives relative timestamps, grouping, and date dividers. */
  sentAt: number
  body: Segment[]
  reactions: Reaction[]
  /**
   * Absent means static — which is every message v0 ever wrote.
   *
   * `"timeline"` means the body performs itself beat by beat when played. It is
   * held separately from the timing on segments rather than inferred from it, so
   * a message stays authored-as-static even if it happens to be a single beat.
   */
  mode?: "static" | "timeline"
  /**
   * Whether this timeline message has been played to the end. Persisted with the
   * thread, so a finished message comes back finished after a reload instead of
   * demanding to be watched again — and a reset clears it along with everything
   * else, since the thread it lives on is what gets emptied.
   */
  played?: boolean
}

export type Author = {
  id: AuthorId
  name: string
  /** Resolved URL, already base-prefixed. See `assets.ts`. */
  avatarUrl: string
}

/**
 * What the list actually renders: messages collapsed into author runs, with date
 * dividers interleaved. Produced by `grouping.ts`; the view never groups.
 */
export type ThreadItem =
  | { kind: "divider"; id: string; dayStart: number }
  | {
      kind: "group"
      id: string
      authorId: AuthorId
      /** `sentAt` of the run's first message — what the header timestamp shows. */
      startedAt: number
      messages: Message[]
    }
