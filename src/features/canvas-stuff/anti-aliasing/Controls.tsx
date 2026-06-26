import { Download, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Panel } from "@/components/floating-panels/FloatingPanels"
import { MAX_RES, MAX_SAMPLES, MIN_RES, MIN_SAMPLES, SCENES } from "./raster"
import type { AASettings } from "./raster"

type Props = {
  settings: AASettings
  onChange: (patch: Partial<AASettings>) => void
  animating: boolean
  onToggleAnimate: (value: boolean) => void
  onExport: () => void
  onCompareStart: () => void
  onCompareEnd: () => void
  onCollapse: () => void
}

export function Controls({
  settings,
  onChange,
  animating,
  onToggleAnimate,
  onExport,
  onCompareStart,
  onCompareEnd,
  onCollapse,
}: Props) {
  const sceneLabel = SCENES.find((s) => s.value === settings.scene)?.label

  return (
    <Panel title="Controls" onCollapse={onCollapse}>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 touch-none select-none"
          aria-label="Hold to compare with the aliased version"
          onPointerDown={(e) => {
            e.preventDefault()
            onCompareStart()
          }}
          onPointerUp={onCompareEnd}
          onPointerLeave={onCompareEnd}
          onPointerCancel={onCompareEnd}
        >
          <Eye />
          Hold to compare
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onExport}
          aria-label="Export PNG"
        >
          <Download />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Scene
        </span>
        <Select
          value={settings.scene}
          onValueChange={(v) => onChange({ scene: v as AASettings["scene"] })}
        >
          <SelectTrigger size="sm" className="w-44 text-xs">
            <SelectValue>{sceneLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {SCENES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Range
        label="Samples"
        value={settings.samples}
        min={MIN_SAMPLES}
        max={MAX_SAMPLES}
        unit={settings.samples === 1 ? "× (off)" : "×"}
        onChange={(samples) => onChange({ samples })}
      />
      <Range
        label="Angle"
        value={settings.angle}
        min={0}
        max={360}
        unit="°"
        onChange={(angle) => onChange({ angle })}
      />
      <Range
        label="Size"
        value={settings.size}
        min={0.1}
        max={0.95}
        step={0.01}
        format={(v) => v.toFixed(2)}
        onChange={(size) => onChange({ size })}
      />
      <Range
        label="Resolution"
        value={settings.resolution}
        min={MIN_RES}
        max={MAX_RES}
        step={10}
        unit="px"
        onChange={(resolution) => onChange({ resolution })}
      />

      <label className="flex cursor-pointer items-center justify-between gap-2 select-none">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Animate
        </span>
        <input
          type="checkbox"
          checked={animating}
          onChange={(e) => onToggleAnimate(e.target.checked)}
          className="size-4 accent-primary"
        />
      </label>
    </Panel>
  )
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  format?: (value: number) => string
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
      <span className="w-14 shrink-0 text-right text-xs text-foreground tabular-nums">
        {format ? format(value) : value}
        {unit}
      </span>
    </label>
  )
}
