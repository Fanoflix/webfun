import { useCallback, useMemo, useRef, useState } from "react"

import type { GifId, ImageId, Segment } from "./types"

/**
 * The draft: what's typed, what's attached, and when it's allowed to send.
 *
 * Attachments are held as segments from the moment they're picked, so submitting
 * is a concatenation rather than a conversion — the composer never holds a shape
 * the message model doesn't already understand.
 */

export type ComposerApi = {
  text: string
  setText: (value: string) => void
  attachments: Segment[]
  attachImage: (id: ImageId) => void
  attachGif: (id: GifId) => void
  removeAttachment: (index: number) => void
  /** False when there's nothing to send. */
  canSend: boolean
  /** Builds the body, clears the draft, and hands it over. No-op when empty. */
  submit: () => void
  /** Focused after picking an emoji or attachment, so typing continues uninterrupted. */
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  /** Inserts at the caret rather than appending — the picker shouldn't jump the cursor. */
  insertAtCaret: (value: string) => void
  /**
   * Replace the entire draft. Used by the timeline composer, which swaps beats in
   * and out of this one editor rather than growing an editor of its own.
   */
  loadDraft: (segments: Segment[]) => void
  /** The draft as a message body, without clearing it. */
  draftBody: Segment[]
}

/**
 * A draft is one text segment followed by its attachments — the order they'd be
 * read in. Shared with the timeline composer, which stores beats in exactly this
 * shape, so a beat can be loaded back into the editor without a conversion.
 */
export function toDraftBody(text: string, attachments: Segment[]): Segment[] {
  const trimmed = text.trim()
  return [
    ...(trimmed ? [{ kind: "text" as const, text: trimmed }] : []),
    ...attachments,
  ]
}

export function useComposer(onSend: (body: Segment[]) => void): ComposerApi {
  const [text, setText] = useState("")
  const [attachments, setAttachments] = useState<Segment[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const canSend = text.trim().length > 0 || attachments.length > 0

  const draftBody = useMemo(
    () => toDraftBody(text, attachments),
    [attachments, text]
  )

  const submit = useCallback(() => {
    if (draftBody.length === 0) return

    onSend(draftBody)
    setText("")
    setAttachments([])
  }, [draftBody, onSend])

  const loadDraft = useCallback((segments: Segment[]) => {
    const textSegment = segments.find((segment) => segment.kind === "text")
    setText(textSegment?.text ?? "")
    setAttachments(segments.filter((segment) => segment.kind !== "text"))
  }, [])

  const attachImage = useCallback((id: ImageId) => {
    setAttachments((current) => [...current, { kind: "image", assetId: id }])
  }, [])

  const attachGif = useCallback((id: GifId) => {
    setAttachments((current) => [...current, { kind: "gif", assetId: id }])
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments((current) => current.filter((_, i) => i !== index))
  }, [])

  /**
   * Splices into the current selection and restores the caret after it. Appending
   * would be simpler, but reaching for an emoji mid-sentence and having it land
   * at the end is the kind of small wrongness that reads as broken.
   */
  const insertAtCaret = useCallback((value: string) => {
    const el = inputRef.current
    if (el === null) {
      setText((current) => current + value)
      return
    }

    const { selectionStart, selectionEnd } = el
    setText((current) => current.slice(0, selectionStart) + value + current.slice(selectionEnd))

    const caret = selectionStart + value.length
    // After React has written the new value back into the textarea.
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }, [])

  return useMemo(
    () => ({
      text,
      setText,
      attachments,
      attachImage,
      attachGif,
      removeAttachment,
      canSend,
      submit,
      inputRef,
      insertAtCaret,
      loadDraft,
      draftBody,
    }),
    [
      attachments,
      attachGif,
      attachImage,
      canSend,
      draftBody,
      insertAtCaret,
      loadDraft,
      removeAttachment,
      submit,
      text,
    ]
  )
}
