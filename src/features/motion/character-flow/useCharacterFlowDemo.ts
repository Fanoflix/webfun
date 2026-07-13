import { useState } from "react"

import { DEFAULT_EASE_KEY, resolveEase } from "../eases"

/** Words the wheel starts with; users can add or remove any of them. */
export const BASE_WORDS = [
  "departures",
  "delayed",
  "boarding",
  "broadway",
  "Crossways",
  "Wayward",
  "StormPeaks",
  "now",
  "The Lich King",
]

/** Arbitrary sentences to scroll through — they share words so runs slide while
 * the rest reflow. */
export const SENTENCES = [
  "the quick brown fox jumps over the lazy dog",
  "the lazy dog sleeps under the quick brown fox",
  "she sells sea shells by the sea shore",
  "we sailed past the shore into the open sea",
  "a journey of a thousand miles begins with one step",
  "all that glitters is not gold my friend",
]

/** Prices to scroll through. */
export const PRICES = ["$1,024", "$980", "$12,300", "$47", "$8,675", "$309"]

/** Which list the preview scrolls through. */
export type Mode = "words" | "sentences" | "price"

export const MODES: { key: Mode; label: string }[] = [
  { key: "words", label: "Words" },
  { key: "sentences", label: "Sentences" },
  { key: "price", label: "Price" },
]

/** All demo state: the live value, the active mode, and the editable Words list. */
export function useCharacterFlowDemo() {
  const [mode, setMode] = useState<Mode>("words")
  const [words, setWords] = useState<string[]>(BASE_WORDS)
  const [wordIndex, setWordIndex] = useState(0)
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [priceIndex, setPriceIndex] = useState(0)
  const [value, setValue] = useState<string>(BASE_WORDS[0])
  const [easeKey, setEaseKey] = useState(DEFAULT_EASE_KEY)

  /** Advance to the next item in the active list (fired by clicking the preview). */
  const advance = () => {
    if (mode === "words") {
      const next = (wordIndex + 1) % words.length
      setWordIndex(next)
      setValue(words[next])
    } else if (mode === "sentences") {
      const next = (sentenceIndex + 1) % SENTENCES.length
      setSentenceIndex(next)
      setValue(SENTENCES[next])
    } else {
      const next = (priceIndex + 1) % PRICES.length
      setPriceIndex(next)
      setValue(PRICES[next])
    }
  }

  /** Switch lists, immediately showing that list's current item. */
  const selectMode = (next: Mode) => {
    setMode(next)
    if (next === "words") setValue(words[wordIndex])
    else if (next === "sentences") setValue(SENTENCES[sentenceIndex])
    else setValue(PRICES[priceIndex])
  }

  const selectWord = (index: number) => {
    setWordIndex(index)
    setValue(words[index])
  }

  const addWord = (word: string) => {
    const trimmed = word.trim()
    if (!trimmed) return
    const next = [...words, trimmed]
    setWords(next)
    setWordIndex(next.length - 1)
    setValue(trimmed)
  }

  const removeWord = (index: number) => {
    if (words.length <= 1) return // never empty the wheel
    const next = words.filter((_, i) => i !== index)
    const adjusted = index < wordIndex ? wordIndex - 1 : wordIndex
    const clamped = Math.min(adjusted, next.length - 1)
    setWords(next)
    setWordIndex(clamped)
    setValue(next[clamped])
  }

  return {
    value,
    setValue,
    mode,
    selectMode,
    words,
    wordIndex,
    advance,
    selectWord,
    addWord,
    removeWord,
    easeKey,
    setEaseKey,
    ease: resolveEase(easeKey),
  }
}
