import { useRef } from "react"
import { Pause, Play, Upload, Volume2, VolumeX } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { DotShape } from "./PixelScreen"

export type ScreenSettings = {
  width: number
  height: number
  gap: number
  dotSize: number
}

const SHAPES: DotShape[] = ["circle", "square", "diamond"]

type Props = {
  settings: ScreenSettings
  onChange: (patch: Partial<ScreenSettings>) => void
  hasVideo: boolean
  playing: boolean
  onTogglePlay: () => void
  muted: boolean
  onToggleMute: () => void
  lockAspect: boolean
  onToggleLockAspect: () => void
  shape: DotShape
  onShapeChange: (shape: DotShape) => void
  onPickFile: (file: File) => void
}

export function Controls({
  settings,
  onChange,
  hasVideo,
  playing,
  onTogglePlay,
  muted,
  onToggleMute,
  lockAspect,
  onToggleLockAspect,
  shape,
  onShapeChange,
  onPickFile,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex w-full max-w-md flex-col gap-5">
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => fileRef.current?.click()}>
          <Upload />
          {hasVideo ? "Replace video" : "Upload video"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={!hasVideo}
          onClick={onTogglePlay}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={!hasVideo}
          onClick={onToggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPickFile(file)
            e.target.value = ""
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
        <Range
          label="Columns"
          value={settings.width}
          min={8}
          max={1920}
          onChange={(width) => onChange({ width })}
        />
        <Range
          label="Rows"
          value={settings.height}
          min={8}
          max={1080}
          onChange={(height) => onChange({ height })}
        />
        <Range
          label="Gap"
          value={settings.gap}
          min={0}
          max={8}
          unit="px"
          onChange={(gap) => onChange({ gap })}
        />
        <Range
          label="Dot size"
          value={settings.dotSize}
          min={1}
          max={10}
          unit="px"
          onChange={(dotSize) => onChange({ dotSize })}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={lockAspect}
            onChange={onToggleLockAspect}
            className="size-4 accent-primary"
          />
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Keep aspect ratio
          </span>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Shape
          </span>
          <select
            value={shape}
            onChange={(e) => onShapeChange(e.target.value as DotShape)}
            className="h-8 rounded-none border border-border bg-background px-2 text-xs capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {SHAPES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {label}
        </span>
        <span className="text-xs text-foreground tabular-nums">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="h-1 w-full cursor-pointer accent-primary"
      />
    </label>
  )
}
