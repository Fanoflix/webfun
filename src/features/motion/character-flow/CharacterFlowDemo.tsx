import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { CharacterFlow } from "./CharacterFlow"
import { useCharacterFlowDemo } from "./useCharacterFlowDemo"
import { WordWheel } from "./WordWheel"

/**
 * Showcase for the CharacterFlow primitive. Type into the field or tap a preset
 * and watch shared characters slide to their new place while the rest roll in /
 * out. The right-hand wheel scrolls through the Words cycle. View-only — state
 * lives in `useCharacterFlowDemo`.
 */
export function CharacterFlowDemo() {
  const {
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
  } = useCharacterFlowDemo()

  const [draft, setDraft] = useState("")
  const displayRef = useRef<HTMLDivElement>(null)

  // Keep the tail (the caret end) in view when the value outgrows the box.
  useEffect(() => {
    const el = displayRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [value])

  const submitWord = () => {
    addWord(draft)
    setDraft("")
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-stretch">
      <div className="min-w-0 flex-1 space-y-8">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">CharacterFlow</h1>
          <p className="text-sm text-muted-foreground">
            NumberFlow-style transitions for any string — shared characters
            slide, the rest roll in and out.
          </p>
        </div>

        <div
          ref={displayRef}
          className="flex min-h-40 items-center overflow-x-auto rounded-lg border border-border bg-card px-6 py-10 [justify-content:safe_center] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <CharacterFlow
            value={value}
            className="text-5xl font-semibold tracking-tight whitespace-nowrap tabular-nums"
          />
        </div>

        <div className="space-y-3">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type to animate…"
            aria-label="Text to animate"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={cycleWords}>
              Words
            </Button>
            {presetNames.map((name) => (
              <Button
                key={name}
                variant="outline"
                onClick={() => cyclePreset(name)}
              >
                {name}
              </Button>
            ))}
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              submitWord()
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a word to the wheel…"
              aria-label="Add a word to the wheel"
            />
            <Button type="submit" disabled={!draft.trim()}>
              Add
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {words.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-border py-1 pr-1 pl-3 text-xs transition-colors",
                  i === wordIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <button
                  type="button"
                  onClick={() => selectWord(i)}
                  className="max-w-32 truncate hover:text-foreground"
                >
                  {word}
                </button>
                <button
                  type="button"
                  onClick={() => removeWord(i)}
                  disabled={words.length <= 1}
                  aria-label={`Remove ${word}`}
                  className="grid size-4 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[28rem] w-full shrink-0 lg:w-44">
        <WordWheel words={words} index={wordIndex} />
      </div>
    </div>
  )
}
