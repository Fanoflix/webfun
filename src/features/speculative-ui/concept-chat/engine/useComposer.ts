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
}

export function useComposer(onSend: (body: Segment[]) => void): ComposerApi {
  const [text, setText] = useState("")
  const [attachments, setAttachments] = useState<Segment[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const canSend = text.trim().length > 0 || attachments.length > 0

  const submit = useCallback(() => {
    const trimmed = text.trim()
    const body: Segment[] = [
      ...(trimmed ? [{ kind: "text" as const, text: trimmed }] : []),
      ...attachments,
    ]
    if (body.length === 0) return

    onSend(body)
    setText("")
    setAttachments([])
  }, [attachments, onSend, text])

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
    }),
    [
      attachments,
      attachGif,
      attachImage,
      canSend,
      insertAtCaret,
      removeAttachment,
      submit,
      text,
    ]
  )
}
