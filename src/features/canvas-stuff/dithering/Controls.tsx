import { useRef } from "react"
import { Download, Eye, ImagePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Panel } from "@/components/floating-panels/FloatingPanels"
import {
  ALGORITHM_GROUPS,
  COLOR_MODES,
  MAX_LEVELS,
  MIN_LEVELS,
} from "./pipeline"
import type { DitherSettings } from "./pipeline"

type Option<T extends string> = { value: T; label: string }
type OptionGroup<T extends string> = { label?: string; options: Option<T>[] }

type Props = {
  settings: DitherSettings
  onChange: (patch: Partial<DitherSettings>) => void
  hasImage: boolean
  onPickFile: (file: File) => void
  onExport: () => void
  onCompareStart: () => void
  onCompareEnd: () => void
  onCollapse: () => void
}

export function Controls({
  settings,
  onChange,
  hasImage,
  onPickFile,
  onExport,
  onCompareStart,
  onCompareEnd,
  onCollapse,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const grayscale = settings.colorMode === "grayscale"

  return (
    <Panel title="Controls" onCollapse={onCollapse}>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => fileRef.current?.click()}>
          <ImagePlus />
          {hasImage ? "Replace" : "Upload image"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={!hasImage}
          onClick={onExport}
          aria-label="Export PNG"
        >
          <Download />
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPickFile(file)
            e.target.value = ""
          }}
        />
      </div>

      <Button
        variant="outline"
        disabled={!hasImage}
        aria-label="Hold to compare with original"
        className="w-full touch-none select-none"
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

      <SelectField
        label="Algorithm"
        value={settings.algorithm}
        groups={ALGORITHM_GROUPS}
        onChange={(algorithm) => onChange({ algorithm })}
      />
      <SelectField
        label="Color"
        value={settings.colorMode}
        groups={[{ options: COLOR_MODES }]}
        onChange={(colorMode) => onChange({ colorMode })}
      />

      <Range
        label="Levels"
        value={settings.levels}
        min={MIN_LEVELS}
        max={MAX_LEVELS}
        unit={grayscale ? " shades" : "/ch"}
        onChange={(levels) => onChange({ levels })}
      />
      <Range
        label="Pixel size"
        value={settings.pixelScale}
        min={1}
        max={16}
        unit="×"
        onChange={(pixelScale) => onChange({ pixelScale })}
      />
      <Range
        label="Contrast"
        value={settings.contrast}
        min={-100}
        max={100}
        onChange={(contrast) => onChange({ contrast })}
      />

      <label className="flex cursor-pointer items-center justify-between gap-2 select-none">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Invert
        </span>
        <input
          type="checkbox"
          checked={settings.invert}
          onChange={(e) => onChange({ invert: e.target.checked })}
          className="size-4 accent-primary"
        />
      </label>
    </Panel>
  )
}

function SelectField<T extends string>({
  label,
  value,
  groups,
  onChange,
}: {
  label: string
  value: T
  groups: OptionGroup<T>[]
  onChange: (value: T) => void
}) {
  const current = groups
    .flatMap((g) => g.options)
    .find((o) => o.value === value)?.label

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger size="sm" className="w-44 text-xs">
          <SelectValue>{current}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {groups.map((g, i) => (
            <SelectGroup key={g.label ?? i}>
              {g.label && <SelectLabel>{g.label}</SelectLabel>}
              {g.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
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
      <span className="w-12 shrink-0 text-right text-xs text-foreground tabular-nums">
        {value}
        {unit}
      </span>
    </label>
  )
}
