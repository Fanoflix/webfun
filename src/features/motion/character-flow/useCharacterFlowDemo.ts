import { useRef, useState } from "react"

/** Words the wheel starts with; users can add or remove any of them. */
export const BASE_WORDS = [
  "departures",
  "arrivals",
  "boarding",
  "delayed",
  "now",
  "The Lich King",
]

/**
 * Fixed-shape presets (codes / times / prices) to show the effect on the shapes
 * it's built for — separate from the free-form Words wheel.
 */
export const PRESETS = {
  Time: ["09:41", "10:03", "14:27", "23:58"],
  Flight: ["AA-421", "DL-1290", "UA-88", "BA-2490"],
  Price: ["$1,024", "$980", "$12,300", "$47"],
} as const

export type PresetName = keyof typeof PRESETS

/** All demo state: the live value, the Words wheel, and preset cyclers. */
export function useCharacterFlowDemo() {
  const [words, setWords] = useState<string[]>(BASE_WORDS)
  const [wordIndex, setWordIndex] = useState(0)
  const [value, setValue] = useState<string>(BASE_WORDS[0])
  // Where each fixed preset is in its list, so repeated taps advance through it.
  const cursors = useRef<Partial<Record<PresetName, number>>>({})

  const showWord = (index: number, list = words) => {
    setWordIndex(index)
    setValue(list[index])
  }

  const cycleWords = () => showWord((wordIndex + 1) % words.length)

  const selectWord = (index: number) => showWord(index)

  const cyclePreset = (name: PresetName) => {
    const list = PRESETS[name]
    const next = ((cursors.current[name] ?? 0) + 1) % list.length
    cursors.current[name] = next
    setValue(list[next])
  }

  const addWord = (word: string) => {
    const trimmed = word.trim()
    if (!trimmed) return
    const next = [...words, trimmed]
    setWords(next)
    showWord(next.length - 1, next) // roll the wheel to the new word
  }

  const removeWord = (index: number) => {
    if (words.length <= 1) return // never empty the wheel
    const next = words.filter((_, i) => i !== index)
    // Keep the wheel centered on a sensible neighbor.
    const adjusted = index < wordIndex ? wordIndex - 1 : wordIndex
    showWord(Math.min(adjusted, next.length - 1), next)
    setWords(next)
  }

  const presetNames = Object.keys(PRESETS) as PresetName[]

  return {
    value,
    setValue,
    words,
    wordIndex,
    cycleWords,
    selectWord,
    cyclePreset,
    addWord,
    removeWord,
    presetNames,
  }
}
