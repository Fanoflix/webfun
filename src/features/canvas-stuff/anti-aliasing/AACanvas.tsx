import { useImperativeHandle, useRef } from "react"
import type { PointerEvent as ReactPointerEvent, ReactNode, Ref } from "react"

export type AACanvasHandle = {
  /** Paint the anti-aliased result (the buffer shown normally). */
  paint: (data: Uint8ClampedArray, w: number, h: number) => void
  /** Paint the aliased (1-sample) result, revealed while comparing. */
  paintCompare: (data: Uint8ClampedArray, w: number, h: number) => void
  /** Download the anti-aliased frame as a PNG. */
  exportPng: (filename: string) => void
  /** Backing canvases, so the loupe can sample their pixels. */
  getCanvas: () => HTMLCanvasElement | null
  getCompareCanvas: () => HTMLCanvasElement | null
}

type Props = {
  comparing: boolean
  displayWidth: number
  displayHeight: number
  onHoldStart: () => void
  onHoldEnd: () => void
  /** Overlays positioned over the canvas (e.g. the loupe selection). */
  children?: ReactNode
  ref?: Ref<AACanvasHandle>
}

function paintTo(
  canvas: HTMLCanvasElement | null,
  data: Uint8ClampedArray,
  w: number,
  h: number
) {
  if (!canvas || w < 1 || h < 1) return
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const img = ctx.createImageData(w, h)
  img.data.set(data)
  ctx.putImageData(img, 0, 0)
}

/**
 * Renders the rasteriser output at working resolution, scaled up with
 * nearest-neighbour (`pixelated`) so individual pixels — and their jaggies —
 * stay visible. Holding the pointer reveals the aliased (1-sample) version
 * layered on top, for a direct before/after.
 */
export function AACanvas({
  comparing,
  displayWidth,
  displayHeight,
  onHoldStart,
  onHoldEnd,
  children,
  ref,
}: Props) {
  const aaRef = useRef<HTMLCanvasElement>(null)
  const aliasedRef = useRef<HTMLCanvasElement>(null)

  useImperativeHandle(
    ref,
    () => ({
      getCanvas: () => aaRef.current,
      getCompareCanvas: () => aliasedRef.current,
      paint: (data, w, h) => paintTo(aaRef.current, data, w, h),
      paintCompare: (data, w, h) => paintTo(aliasedRef.current, data, w, h),
      exportPng(filename) {
        const canvas = aaRef.current
        if (!canvas) return
        canvas.toBlob((blob) => {
          if (!blob) return
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = filename
          a.click()
          URL.revokeObjectURL(url)
        }, "image/png")
      },
    }),
    []
  )

  const endHold = () => comparing && onHoldEnd()
  const startHold = (e: ReactPointerEvent) => {
    e.preventDefault()
    onHoldStart()
  }

  return (
    <div
      className="relative touch-none select-none"
      style={{ width: displayWidth, height: displayHeight }}
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      onPointerCancel={endHold}
    >
      <canvas
        ref={aaRef}
        className="block h-full w-full [image-rendering:pixelated]"
      />
      <canvas
        ref={aliasedRef}
        hidden={!comparing}
        className="pointer-events-none absolute inset-0 h-full w-full [image-rendering:pixelated]"
      />
      {children}
    </div>
  )
}
