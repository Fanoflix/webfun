import { useRef, useState } from "react"
import { Minus, Plus, Upload } from "lucide-react"

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
  lockAspect,
  onToggleLockAspect,
  shape,
  onShapeChange,
  onPickFile,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Expand controls"
        className="fixed top-4 right-4 z-50 grid size-9 place-items-center border border-border bg-background text-muted-foreground shadow-lg hover:text-foreground"
      >
        <Plus className="size-4" />
      </button>
    )
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex w-80 flex-col gap-3 border border-border bg-background p-3 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Controls
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse controls"
          className="text-muted-foreground hover:text-foreground"
        >
          <Minus className="size-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => fileRef.current?.click()}>
          <Upload />
          {hasVideo ? "Replace video" : "Upload video"}
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

      <Range
        label="Columns"
        value={settings.width}
        min={1}
        max={900}
        onChange={(width) => onChange({ width })}
      />
      <Range
        label="Rows"
        value={settings.height}
        min={1}
        max={900}
        onChange={(height) => onChange({ height })}
      />
      <Range
        label="Gap"
        value={settings.gap}
        min={0}
        max={50}
        unit="px"
        onChange={(gap) => onChange({ gap })}
      />
      <Range
        label="Dot size"
        value={settings.dotSize}
        min={1}
        max={100}
        unit="px"
        onChange={(dotSize) => onChange({ dotSize })}
      />

      <label className="flex cursor-pointer items-center justify-between gap-2 select-none">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Keep aspect ratio
        </span>
        <input
          type="checkbox"
          checked={lockAspect}
          onChange={onToggleLockAspect}
          className="size-4 accent-primary"
        />
      </label>

      <label className="flex items-center justify-between gap-2">
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
    <label className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="h-1 flex-1 cursor-pointer accent-primary"
      />
      <span className="w-10 shrink-0 text-right text-xs text-foreground tabular-nums">
        {value}
        {unit}
      </span>
    </label>
  )
}
