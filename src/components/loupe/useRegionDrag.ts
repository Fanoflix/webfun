import { useRef } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"

import type { Region } from "./region"

const MIN = 0.02
const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

/**
 * Pointer-drag behaviour for the loupe's selection rectangle: drag the body to
 * move it, drag the corner handle to resize. Both are expressed in normalised
 * (0..1) coordinates so they survive resolution changes. Resizing stays square
 * on screen (`w * width === h * height`); the owner decides what the size means
 * (typically a zoom level). Keeping this in a hook lets the overlay component
 * stay purely presentational.
 */
export function useRegionDrag({
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
  // Live values, read at drag time so an in-flight drag uses current sizing.
  const regionRef = useRef(region)
  regionRef.current = region
  const sizeRef = useRef({ width, height })
  sizeRef.current = { width, height }

  const drag = (
    e: ReactPointerEvent,
    apply: (start: Region, dx: number, dy: number) => Region
  ) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const start = regionRef.current
    const move = (ev: PointerEvent) => {
      const { width: w, height: h } = sizeRef.current
      onChange(
        apply(start, (ev.clientX - startX) / w, (ev.clientY - startY) / h)
      )
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const startMove = (e: ReactPointerEvent) =>
    drag(e, (s, dx, dy) => ({
      ...s,
      x: clamp(s.x + dx, 0, 1 - s.w),
      y: clamp(s.y + dy, 0, 1 - s.h),
    }))

  // Resize square: a horizontal delta drives the side, height matched in display
  // pixels so the box stays 1:1 on screen. The owner maps the size to a zoom.
  const startResize = (e: ReactPointerEvent) =>
    drag(e, (s, dx) => {
      const { width: w, height: h } = sizeRef.current
      const nw = clamp(s.w + dx, MIN, 1 - s.x)
      const nh = Math.min((nw * w) / h, 1 - s.y)
      return { ...s, w: nw, h: nh }
    })

  return { startMove, startResize }
}
