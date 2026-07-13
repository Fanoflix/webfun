import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { Info, RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { EASES } from "../eases"
import { StyleFlow } from "./StyleFlow"
import { ALL_TRACKS } from "./useStyleFlow"
import {
  COOLDOWNS,
  PICKS,
  TRACK_LABELS,
  useStyleFlowDemo,
} from "./useStyleFlowDemo"

/**
 * Showcase for the StyleFlow primitive. The preview shimmers each character
 * across weight / italic / serif / size, one track at a time, never repeating a
 * track within the cooldown. Click the preview to shuffle. View-only — all state
 * lives in `useStyleFlowDemo`.
 */
export function StyleFlowDemo() {
  const {
    value,
    setValue,
    seed,
    playToken,
    cooldown,
    setCooldown,
    duration,
    setDuration,
    stepInterval,
    setStepInterval,
    stepDuration,
    setStepDuration,
    trackPick,
    setTrackPick,
    easeKey,
    setEaseKey,
    ease,
    looping,
    setLooping,
    active,
    toggleTrack,
    tracks,
    replay,
    nextSample,
  } = useStyleFlowDemo()

  return (
    <TooltipProvider delay={200}>
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">StyleFlow</h1>
          <p className="text-sm text-muted-foreground">
            A per-character typographic shimmer — each letter drifts across
            weight, italic, serif and size, one track at a time, then settles.
          </p>
        </div>

        <div className="space-y-2">
          <div
            role="button"
            tabIndex={0}
            onClick={nextSample}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                nextSample()
              }
            }}
            className="flex min-h-44 cursor-pointer items-center justify-center overflow-hidden border border-border px-6 py-10 select-none"
          >
            <StyleFlow
              value={value}
              seed={seed}
              playToken={playToken}
              cooldown={cooldown}
              tracks={tracks}
              trackPick={trackPick}
              duration={duration}
              stepInterval={stepInterval}
              stepDuration={stepDuration}
              ease={ease}
              weights={[100, 200, 300, 400, 500, 600, 700, 800, 900]}
              sizeRange={[28, 72]}
              stagger={0}
              restStyle={{ weight: 500, family: "sans", size: 50 }}
              className="tracking-tighter"
            />
          </div>
          <p className="text-center text-[10px] font-normal tracking-widest text-muted-foreground">
            Click the preview to shuffle the word
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              variant="filled"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Type to animate…"
              aria-label="Text to animate"
            />
            <Button variant="outline" onClick={replay} aria-label="Replay">
              <RotateCw />
              Replay
            </Button>
          </div>

          {/* One config per line — label + info hint on the left, control on the right. */}
          <div className="divide-y divide-border border border-border">
            <ConfigRow
              label="Tracks"
              hint="Which style dimensions may change. Switch one off to pin it at its resting value for the whole run."
            >
              {ALL_TRACKS.map((track) => (
                <Button
                  key={track}
                  size="sm"
                  variant={active[track] ? "default" : "outline"}
                  aria-pressed={active[track]}
                  onClick={() => toggleTrack(track)}
                >
                  {TRACK_LABELS[track]}
                </Button>
              ))}
            </ConfigRow>

            <ConfigRow
              label="Cooldown"
              hint="Turns a track must sit out after it changes before it may change again. 1 means a track can never change twice in a row."
            >
              {COOLDOWNS.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={cooldown === c ? "default" : "outline"}
                  aria-pressed={cooldown === c}
                  onClick={() => setCooldown(c)}
                >
                  {c}
                </Button>
              ))}
            </ConfigRow>

            <ConfigRow
              label="Order"
              hint="How the next track is chosen each turn — a random eligible track, or strict round-robin through them."
            >
              {PICKS.map(({ key, label }) => (
                <Button
                  key={key}
                  size="sm"
                  variant={trackPick === key ? "default" : "outline"}
                  aria-pressed={trackPick === key}
                  onClick={() => setTrackPick(key)}
                >
                  {label}
                </Button>
              ))}
            </ConfigRow>

            <ConfigRow
              label="Easing"
              hint="The easing curve applied to each track transition. Overshoot curves (Springy, Elastic, Bounce) pop past the target and settle back on every change."
            >
              <Select
                value={easeKey}
                onValueChange={(v) => setEaseKey(v as string)}
              >
                <SelectTrigger size="sm" className="w-40" aria-label="Easing">
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
            </ConfigRow>

            <ConfigRow
              label="Duration"
              hint="Total run length in seconds. The animation is finite — it plays once and settles back to the resting style."
            >
              <NumberField
                value={duration}
                onCommit={setDuration}
                min={0.5}
                step={0.5}
                suffix="sec"
                ariaLabel="Duration in seconds"
              />
            </ConfigRow>

            <ConfigRow
              label="Step interval"
              hint="Seconds between the start of a character's consecutive turns — the gap between changes. Lower is busier."
            >
              <NumberField
                value={stepInterval}
                onCommit={setStepInterval}
                step={0.05}
                suffix="sec"
                ariaLabel="Step interval in seconds"
              />
            </ConfigRow>

            <ConfigRow
              label="Step duration"
              hint="Seconds one track's transition takes. Keep it at or below the step interval so changes don't overlap."
            >
              <NumberField
                value={stepDuration}
                onCommit={setStepDuration}
                step={0.05}
                suffix="sec"
                ariaLabel="Step duration in seconds"
              />
            </ConfigRow>

            <ConfigRow
              label="Loop"
              hint="Replays the finite run on a timer so the preview keeps shimmering. The component itself never loops — this is the demo re-triggering it."
            >
              <Button
                size="sm"
                variant={looping ? "default" : "outline"}
                aria-pressed={looping}
                onClick={() => setLooping((v) => !v)}
              >
                {looping ? "On" : "Off"}
              </Button>
            </ConfigRow>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

/**
 * A numeric field that keeps a free-form text draft while editing — so it can be
 * cleared and retyped — and only clamps to `[min, max]` on blur or Enter,
 * committing the result upward. `min`/`max` are optional; omit either to leave
 * that side unbounded.
 */
function NumberField({
  value,
  onCommit,
  min,
  max,
  step,
  suffix,
  ariaLabel,
}: {
  value: number
  onCommit: (next: number) => void
  min?: number
  max?: number
  step: number
  suffix?: string
  ariaLabel: string
}) {
  const [draft, setDraft] = useState(String(value))

  // Reflect external changes (e.g. a preset elsewhere) when not mid-edit.
  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = () => {
    const parsed = Number(draft)
    let next = value
    if (Number.isFinite(parsed)) {
      next = parsed
      if (min !== undefined) next = Math.max(min, next)
      if (max !== undefined) next = Math.min(max, next)
    }
    onCommit(next)
    setDraft(String(next)) // snap the text back to the clamped value
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        variant="filled"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
        }}
        aria-label={ariaLabel}
        className="h-9 w-20 text-center"
      />
      {suffix ? (
        <span className="text-xs text-muted-foreground">{suffix}</span>
      ) : null}
    </div>
  )
}

/** A single labelled config row: name + info hint on the left, control on the right. */
function ConfigRow({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
        <Tooltip>
          <TooltipTrigger
            className="text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
            aria-label={`About ${label}`}
          >
            <Info className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs leading-relaxed">
            {hint}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">{children}</div>
    </div>
  )
}
