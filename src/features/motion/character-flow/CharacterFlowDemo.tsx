import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { EASES } from "../eases"
import { CharacterFlow } from "./CharacterFlow"
import { MODES, useCharacterFlowDemo } from "./useCharacterFlowDemo"
import { WordWheel } from "./WordWheel"

/**
 * Showcase for the CharacterFlow primitive. Pick a mode (Words / Sentences /
 * Price) to choose which list scrolls, then click anywhere on the preview to fly
 * through it and watch the animation. Words mode also shows an editable wheel.
 * View-only — state lives in `useCharacterFlowDemo`.
 */
export function CharacterFlowDemo() {
  const {
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
    ease,
  } = useCharacterFlowDemo()

  const [draft, setDraft] = useState("")
  const displayRef = useRef<HTMLDivElement>(null)
  const isWords = mode === "words"

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
    <div className="flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-start lg:gap-0">
      <div className="min-w-0 flex-1 space-y-8">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">
            CharacterFlow
          </h1>
          <p className="text-sm text-muted-foreground">
            NumberFlow-style transitions for any string — shared characters
            slide, the rest roll in and out.
          </p>
        </div>

        <div className="space-y-2">
          <div
            ref={displayRef}
            role="button"
            tabIndex={0}
            onClick={advance}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                advance()
              }
            }}
            className="flex min-h-40 cursor-pointer [scrollbar-width:none] items-center [justify-content:safe_center] overflow-x-auto border border-border px-6 py-10 select-none [&::-webkit-scrollbar]:hidden"
          >
            <CharacterFlow
              value={value}
              className={cn(
                "tracking-tight whitespace-nowrap tabular-nums",
                mode === "sentences"
                  ? "text-xl font-normal"
                  : "text-5xl font-semibold"
              )}
              exit={{ duration: 0.2 }}
              stagger={0.01}
              duration={0.5}
              rollDistance={0.3}
              ease={ease}
              layoutEase={ease}
            />
          </div>
          <p className="text-center text-[10px] font-normal tracking-widest text-muted-foreground">
            Click anywhere inside the preview to change contents
          </p>
        </div>

        <div className="space-y-3">
          <Input
            variant="filled"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type to animate…"
            aria-label="Text to animate"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {MODES.map(({ key, label }) => (
                <Button
                  key={key}
                  variant={mode === key ? "default" : "outline"}
                  aria-pressed={mode === key}
                  onClick={() => selectMode(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Easing
              </span>
              <Select
                value={easeKey}
                onValueChange={(v) => v !== null && setEaseKey(v)}
              >
                <SelectTrigger size="sm" className="w-36" aria-label="Easing">
                  <SelectValue>
                    {(v) => EASES.find((e) => e.key === v)?.label ?? String(v)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EASES.map(({ key, label }) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isWords && (
          <motion.div
            key="wheel"
            initial={{ opacity: 0, width: 0, marginLeft: 0, height: 0 }}
            animate={{ opacity: 1, width: 176, marginLeft: 12, height: 339 }}
            exit={{ opacity: 0, width: 0, marginLeft: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0 overflow-hidden"
          >
            <div className="flex h-full w-40 flex-col gap-2">
              <div className="min-h-0 flex-1">
                <WordWheel
                  words={words}
                  index={wordIndex}
                  onSelect={selectWord}
                  onRemove={removeWord}
                />
              </div>
              <form
                className="flex gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault()
                  submitWord()
                }}
              >
                <Input
                  variant="filled"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add a word…"
                  aria-label="Add a word to the wheel"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!draft.trim()}
                  aria-label="Add word"
                >
                  <Plus />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
