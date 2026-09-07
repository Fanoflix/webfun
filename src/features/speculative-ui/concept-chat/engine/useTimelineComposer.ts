import { useCallback, useMemo, useState } from "react"

import { flatten } from "./beats"
import type { Beat } from "./beats"
import { DEFAULT_BEAT_ENTER, DEFAULT_HOLD_MS } from "./defaults"
import type { ComposerApi } from "./useComposer"
import type { Message, Segment } from "./types"

/**
 * Composing a timeline message.
 *
 * The key decision: **there is only one editor.** The selected beat *is* the
 * regular composer's draft — its text, its attachments, its emoji picker, its
 * `+` button. Beats are stored beside it, and selecting one swaps it into the
 * editor. So a beat can hold text and media together for free, and none of the
 * composer's behaviour is written twice.
 *
 * That swap is an explicit action, never a synchronising effect: every operation
 * that changes which beat is selected first writes the live draft back into the
 * one it's leaving, then loads the one it's arriving at.
 */

export type TimelineComposerApi = {
  active: boolean
  /** Every beat, with the selected one showing what's live in the editor. */
  beats: Beat[]
  selectedIndex: number
  /** Turn the composer into a timeline composer, keeping whatever's typed. */
  enable: () => void
  /** Back to a plain message, keeping the selected beat as the draft. */
  disable: () => void
  select: (index: number) => void
  /** Insert an empty beat after the selected one and move to it. */
  addBeat: () => void
  removeBeat: (index: number) => void
  setHold: (index: number, ms: number) => void
  /** Swap a beat with its neighbour. Selection follows the beat, not the slot. */
  moveBeat: (index: number, direction: -1 | 1) => void
  canSend: boolean
  submit: () => void
  /**
   * Non-null while previewing, and changes on each press so the preview remounts
   * and plays from the top rather than resuming wherever it was left.
   */
  previewKey: number | null
  preview: () => void
  closePreview: () => void
  /** The draft as it would arrive in the thread. `null` when there's nothing yet. */
  previewMessage: Message | null
}

function newBeat(segments: Segment[]): Beat {
  return {
    id: crypto.randomUUID(),
    segments,
    hold: DEFAULT_HOLD_MS,
    enter: DEFAULT_BEAT_ENTER,
  }
}

export function useTimelineComposer(
  composer: ComposerApi,
  onSend: (body: Segment[], mode: Message["mode"]) => void
): TimelineComposerApi {
  const [active, setActive] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [previewKey, setPreviewKey] = useState<number | null>(null)

  /**
   * Every beat *except* the live one. The selected beat's contents deliberately
   * aren't duplicated here — they live in the editor, and are folded back in on
   * the way out. Two copies of the same text is how they end up disagreeing.
   */
  const [stored, setStored] = useState<Beat[]>([])

  const { draftBody, inputRef } = composer

  /**
   * Selecting a beat is the same gesture as clicking into a text field — the
   * card *is* the editor's contents. Leaving focus behind means the next
   * keystroke goes nowhere, which reads as the click not having worked.
   *
   * The hold chip deliberately doesn't do this: picking a duration isn't
   * choosing what to type into.
   */
  const loadDraft = useCallback(
    (segments: Segment[]) => {
      composer.loadDraft(segments)
      inputRef.current?.focus()
    },
    [composer, inputRef]
  )

  /** `stored`, with the editor's current contents written over the selection. */
  const withDraft = useCallback(
    (list: Beat[]): Beat[] =>
      list.map((beat, index) =>
        index === selectedIndex ? { ...beat, segments: draftBody } : beat
      ),
    [draftBody, selectedIndex]
  )

  const beats = useMemo(() => withDraft(stored), [stored, withDraft])

  const enable = useCallback(() => {
    setStored([newBeat(draftBody)])
    setSelectedIndex(0)
    setActive(true)
    // The click that opened this took focus off the editor, and the first thing
    // anyone does next is type the opening beat. The textarea is the same one
    // that was already there, so it can take focus straight away.
    inputRef.current?.focus()
  }, [draftBody, inputRef])

  const disable = useCallback(() => {
    setActive(false)
    setStored([])
    setSelectedIndex(0)
    setPreviewKey(null)
  }, [])

  const select = useCallback(
    (index: number) => {
      // Re-selecting the beat you're already on still puts the caret back: the
      // click landed on a button, which took focus off the editor, and typing
      // has to keep working straight afterwards.
      if (index === selectedIndex) {
        inputRef.current?.focus()
        return
      }
      const next = withDraft(stored)
      setStored(next)
      setSelectedIndex(index)
      loadDraft(next[index].segments)
    },
    [inputRef, loadDraft, selectedIndex, stored, withDraft]
  )

  const addBeat = useCallback(() => {
    const next = withDraft(stored)
    const at = selectedIndex + 1
    setStored([...next.slice(0, at), newBeat([]), ...next.slice(at)])
    setSelectedIndex(at)
    loadDraft([])
  }, [loadDraft, selectedIndex, stored, withDraft])

  const removeBeat = useCallback(
    (index: number) => {
      const next = withDraft(stored).filter((_, i) => i !== index)
      if (next.length === 0) {
        disable()
        loadDraft([])
        return
      }
      // Removing what's in the editor means something else has to fill it; the
      // beat before is where the eye already is.
      const nextIndex = Math.min(selectedIndex, next.length - 1)
      setStored(next)
      setSelectedIndex(nextIndex)
      if (index === selectedIndex) loadDraft(next[nextIndex].segments)
    },
    [disable, loadDraft, selectedIndex, stored, withDraft]
  )

  const setHold = useCallback((index: number, ms: number) => {
    setStored((current) =>
      current.map((beat, i) => (i === index ? { ...beat, hold: ms } : beat))
    )
  }, [])

  const moveBeat = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction
      const next = withDraft(stored)
      if (target < 0 || target >= next.length) return

      const swapped = [...next]
      swapped[index] = next[target]
      swapped[target] = next[index]
      setStored(swapped)

      // The selection is on a beat, not a position — if the moved beat was the
      // one being edited, follow it rather than staying put.
      if (selectedIndex === index) setSelectedIndex(target)
      else if (selectedIndex === target) setSelectedIndex(index)
    },
    [selectedIndex, stored, withDraft]
  )

  /** Empty beats are dropped rather than sent as blank pauses nobody authored. */
  const filled = useMemo(
    () => beats.filter((beat) => beat.segments.length > 0),
    [beats]
  )

  const canSend = filled.length > 0

  const previewMessage = useMemo<Message | null>(() => {
    if (previewKey === null || filled.length === 0) return null
    return {
      id: `preview-${previewKey}`,
      authorId: "viewer",
      sentAt: Date.now(),
      body: flatten(filled),
      reactions: [],
      mode: "timeline",
    }
  }, [filled, previewKey])

  const submit = useCallback(() => {
    if (filled.length === 0) return
    onSend(flatten(filled), "timeline")
    loadDraft([])
    disable()
  }, [disable, filled, loadDraft, onSend])

  const preview = useCallback(() => setPreviewKey((key) => (key ?? 0) + 1), [])
  const closePreview = useCallback(() => setPreviewKey(null), [])

  return useMemo(
    () => ({
      active,
      beats,
      selectedIndex,
      enable,
      disable,
      select,
      addBeat,
      removeBeat,
      setHold,
      moveBeat,
      canSend,
      submit,
      previewKey,
      preview,
      closePreview,
      previewMessage,
    }),
    [
      active,
      addBeat,
      beats,
      canSend,
      closePreview,
      disable,
      enable,
      moveBeat,
      preview,
      previewKey,
      previewMessage,
      removeBeat,
      select,
      selectedIndex,
      setHold,
      submit,
    ]
  )
}
