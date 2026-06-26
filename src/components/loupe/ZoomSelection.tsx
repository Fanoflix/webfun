import type { Region } from "./region"
import { useRegionDrag } from "./useRegionDrag"

/**
 * The loupe's selection rectangle, drawn over the content. Purely presentational
 * — all the drag/resize maths lives in {@link useRegionDrag}. `width`/`height`
 * are the displayed content size, used to convert pointer pixels to fractions.
 */
export function ZoomSelection({
  region,
  width,
  height,
  onChange,
}: {
  region: Region
  width: number
  height: number
  onChange: (region: Region) => void
}) {
  const { startMove, startResize } = useRegionDrag({
    region,
    width,
    height,
    onChange,
  })

  return (
    <div
      onPointerDown={startMove}
      className="absolute cursor-move touch-none border-2 border-primary bg-primary/5"
      style={{
        left: `${region.x * 100}%`,
        top: `${region.y * 100}%`,
        width: `${region.w * 100}%`,
        height: `${region.h * 100}%`,
      }}
    >
      <div
        onPointerDown={startResize}
        aria-label="Resize zoom region"
        className="absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize touch-none border-2 border-primary bg-background"
      />
    </div>
  )
}
