import { useRef, useState } from "react"

/**
 * Themed strings to cycle through, so the effect can be seen on the shapes it's
 * built for: fixed-width codes, times, prices, and plain words of differing
 * lengths (to show characters inserting / removing, not just swapping in place).
 */
export const PRESETS = {
  Words: [
    "departures",
    "arrivals",
    "boarding",
    "now",
    "delayed",
    "wow",
    "dude",
    "The Lich King",
    "Lich King",
    "King",
    "Ammar",
  ],
  Time: ["09:41", "10:03", "14:27", "23:58"],
  Flight: ["AA-421", "DL-1290", "UA-88", "BA-2490"],
  Price: ["$1,024", "$980", "$12,300", "$47"],
} as const

export type PresetName = keyof typeof PRESETS

/** All demo state for CharacterFlow: the live value plus preset cyclers. */
export function useCharacterFlowDemo() {
  const [value, setValue] = useState<string>(PRESETS.Words[0])
  // Where each preset is in its list, so repeated taps advance through it.
  const cursors = useRef<Partial<Record<PresetName, number>>>({})

  const cycle = (name: PresetName) => {
    const list = PRESETS[name]
    const next = ((cursors.current[name] ?? 0) + 1) % list.length
    cursors.current[name] = next
    setValue(list[next])
  }

  const presetNames = Object.keys(PRESETS) as PresetName[]

  return { value, setValue, cycle, presetNames }
}
