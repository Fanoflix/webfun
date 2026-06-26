import type { Ref } from "react"

import { Panel } from "@/components/floating-panels/FloatingPanels"

/**
 * The loupe window: a magnified, nearest-neighbour view of the selected region
 * (painted into `loupeRef` by the owning hook) plus the zoom-level control. The
 * region itself is moved/resized on the content via {@link ZoomSelection}.
 */
export function ZoomBox({
  loupeRef,
  zoomLevel,
  onZoomLevelChange,
  disabled = false,
  placeholder = "No image",
}: {
  loupeRef: Ref<HTMLCanvasElement>
  zoomLevel: number
  onZoomLevelChange: (value: number) => void
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <Panel title="Zoom">
      <div className="relative aspect-square w-full overflow-hidden border border-border bg-black">
        <canvas
          ref={loupeRef}
          className="h-full w-full [image-rendering:pixelated]"
        />
        {disabled && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="text-xs tracking-widest text-white/40 uppercase">
              {placeholder}
            </p>
          </div>
        )}
      </div>

      <label className="flex items-center gap-3">
        <span className="w-20 shrink-0 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Zoom
        </span>
        <input
          type="range"
          min={1}
          max={32}
          step={0.1}
          value={zoomLevel}
          onChange={(e) => onZoomLevelChange(e.target.valueAsNumber)}
          disabled={disabled}
          className="h-1 flex-1 cursor-pointer accent-primary"
        />
        <span className="w-12 shrink-0 text-right text-xs text-foreground tabular-nums">
          {zoomLevel.toFixed(1)}×
        </span>
      </label>
    </Panel>
  )
}
