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

/** Re-exported so consumers get the whole message vocabulary from one module. */
export type { GifId, ImageId }

export type AuthorId = string
export type MessageId = string

/**
 * A piece of a message body. Discriminated on `kind` so the renderer is a total
 * switch and a new segment type is a compile error everywhere it matters.
 *
 * v1 adds `timing?: { at: number; hold?: number; exit?: ExitStyle }` to each
 * variant. Optional, so every v0 message stays valid: no timing means "show
 * immediately and keep showing".
 */
export type Segment =
  | { kind: "text"; text: string }
  | { kind: "image"; assetId: ImageId }
  | { kind: "gif"; assetId: GifId }

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
