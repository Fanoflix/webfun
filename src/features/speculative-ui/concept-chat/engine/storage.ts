import { GIFS, IMAGES } from "./assets"
import type { Message, Reaction, Segment } from "./types"

/**
 * Persistence for the thread.
 *
 * Two rules this module exists to enforce:
 *
 * 1. **Stored data is untrusted.** It was written by an older build, possibly
 *    hand-edited, and it survives across deploys. Everything is validated on the
 *    way in; anything malformed drops the whole thread back to the seed rather
 *    than half-loading into a shape the renderer can't handle.
 * 2. **Nothing here runs during SSR.** Every entry point tolerates a missing
 *    `window`, so the module is safe to import anywhere.
 *
 * Bumping `SCHEMA_VERSION` changes the key, which discards old data instead of
 * migrating it. That's the right trade for a demo — but note that shipping a
 * bump wipes anything a visitor has written.
 */

/** v2 wrapped the bare message array in an envelope carrying the expiry. */
const SCHEMA_VERSION = 2
const STORAGE_KEY = `webfun:concept-chat:v${SCHEMA_VERSION}`

/**
 * Whether to skip the reset confirmation. Kept under its own key, deliberately
 * outside the versioned envelope: it's a preference about the UI, not part of
 * the conversation, and it shouldn't be lost every time the thread schema moves.
 */
const SKIP_CONFIRM_KEY = "webfun:concept-chat:skip-reset-confirm"

export type StoredThread = {
  messages: Message[]
  /** Epoch ms after which the conversation is discarded. */
  expiresAt: number
}

/**
 * Returns `null` for missing, malformed **or expired** data — all three mean the
 * same thing to the caller: start fresh. Expiry is enforced here rather than only
 * by the live timer, so a tab reopened days later doesn't restore a stale thread
 * before the timer gets a chance to fire.
 */
export function loadThread(): StoredThread | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isStoredThread(parsed)) return null
    if (Date.now() >= parsed.expiresAt) return null
    return parsed
  } catch {
    // Storage disabled (private mode, blocked cookies) or unparseable JSON.
    // Either way the thread falls back to the seed.
    return null
  }
}

export function saveThread(thread: StoredThread): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(thread))
  } catch {
    // Quota exceeded or storage disabled — the in-memory thread still works.
  }
}

export function clearThread(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do; the caller resets state regardless.
  }
}

export function loadSkipResetConfirm(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(SKIP_CONFIRM_KEY) === "true"
  } catch {
    return false
  }
}

export function saveSkipResetConfirm(skip: boolean): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(SKIP_CONFIRM_KEY, String(skip))
  } catch {
    // A preference that fails to persist is not worth breaking anything over.
  }
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string")
}

/**
 * Media ids are checked against the live manifests, not just for being strings.
 * A message referencing an asset that has since been renamed or removed would
 * otherwise render a broken image forever, with no way back except a reset.
 */
function isSegment(value: unknown): value is Segment {
  if (!isRecord(value)) return false
  switch (value.kind) {
    case "text":
      return typeof value.text === "string"
    case "image":
      return (
        typeof value.assetId === "string" && Object.hasOwn(IMAGES, value.assetId)
      )
    case "gif":
      return (
        typeof value.assetId === "string" && Object.hasOwn(GIFS, value.assetId)
      )
    default:
      return false
  }
}

function isReaction(value: unknown): value is Reaction {
  return (
    isRecord(value) && typeof value.emoji === "string" && isStringArray(value.by)
  )
}

function isMessage(value: unknown): value is Message {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.authorId === "string" &&
    typeof value.sentAt === "number" &&
    Number.isFinite(value.sentAt) &&
    Array.isArray(value.body) &&
    value.body.every(isSegment) &&
    Array.isArray(value.reactions) &&
    value.reactions.every(isReaction)
  )
}

function isStoredThread(value: unknown): value is StoredThread {
  return (
    isRecord(value) &&
    typeof value.expiresAt === "number" &&
    Number.isFinite(value.expiresAt) &&
    Array.isArray(value.messages) &&
    value.messages.every(isMessage)
  )
}
