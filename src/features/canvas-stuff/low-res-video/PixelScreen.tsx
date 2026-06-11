import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
} from "react"
import type { PointerEvent as ReactPointerEvent, Ref } from "react"

export type DotShape = "circle" | "square" | "diamond"

export type PixelScreenHandle = {
  /** Push a fresh RGBA buffer (length `width*height*4`) onto the screen. */
  paint: (data: Uint8ClampedArray) => void
}

// "Screen off" dot colour, shown before a video is loaded.
const OFF_LEVEL = 20

// The screen keeps the video's aspect ratio, resized by the corner handle (px).
const DEFAULT_SCREEN_WIDTH = 640
const MIN_SCREEN_WIDTH = 240

// Caps the render buffer so dense grids stay fast (the backing is scaled to the
// frame by the browser).
const MAX_BACKING_PIXELS = 2_500_000

type Props = {
  width: number
  height: number
  gap: number
  dotSize: number
  shape: DotShape
  /** Display aspect ratio (videoWidth / videoHeight). */
  aspect: number
  ref?: Ref<PixelScreenHandle>
}

/**
 * The virtual screen: a fixed 16:9 frame, resizable by a corner handle, that
 * shows the video as a `width`×`height` grid of dots. The frame size is
 * independent of the dot count — columns/rows only change the dot density.
 *
 * Each frame is resampled into a reused `ImageData` buffer with even, integer
 * cells (so a dot never lands on a fractional pixel → no moiré); the browser
 * then scales that buffer to fill the frame. Cost is bounded by the buffer
 * area, not the dot count, and playback never triggers a React re-render.
 */
export const PixelScreen = memo(function PixelScreen({
  width,
  height,
  gap,
  dotSize,
  shape,
  aspect,
  ref,
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Latest render params, read by `render` without re-subscribing each frame.
  const paramsRef = useRef({ width, height, gap, dotSize, shape })
  paramsRef.current = { width, height, gap, dotSize, shape }
  // Last painted frame, so tweaking controls while paused updates instantly.
  const lastFrameRef = useRef<Uint8ClampedArray | null>(null)
  // Reused output buffer + per-column lookup tables (avoid per-frame allocs).
  const bufRef = useRef<ImageData | null>(null)
  const colSrcRef = useRef<Int32Array | null>(null)
  const colFracRef = useRef<Int32Array | null>(null)

  // User-controlled frame width (CSS px); height is derived from 16:9.
  const [screenW, setScreenW] = useState(DEFAULT_SCREEN_WIDTH)
  const screenWRef = useRef(screenW)
  screenWRef.current = screenW
  const dprRef = useRef(1)
  const [, bumpEnv] = useReducer((n: number) => n + 1, 0)

  // Track the device pixel ratio (it can change across monitors / zoom).
  useEffect(() => {
    const update = () => {
      dprRef.current = window.devicePixelRatio || 1
      bumpEnv()
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const render = useCallback((data: Uint8ClampedArray) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const {
      width: cols,
      height: rows,
      gap: gapPx,
      dotSize: dot,
      shape: dotShape,
    } = paramsRef.current
    if (data.length !== cols * rows * 4) return // grid resized; wait for a matching frame

    const availW = screenWRef.current
    if (availW < 1) return

    // Even integer cell, sized to roughly the frame's device width, capped so
    // the backing never gets huge. CSS stretches the backing to the 16:9 frame.
    const targetDevW = availW * dprRef.current
    let cellPx = Math.max(1, Math.round(targetDevW / cols))
    if (cols * rows * cellPx * cellPx > MAX_BACKING_PIXELS) {
      cellPx = Math.max(
        1,
        Math.floor(Math.sqrt(MAX_BACKING_PIXELS / (cols * rows)))
      )
    }
    const dotPx = Math.max(
      1,
      Math.min(cellPx, Math.round((dot / (dot + gapPx)) * cellPx))
    )
    const bw = cols * cellPx
    const bh = rows * cellPx

    if (canvas.width !== bw) canvas.width = bw
    if (canvas.height !== bh) canvas.height = bh

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let buf = bufRef.current
    if (!buf || buf.width !== bw || buf.height !== bh) {
      buf = ctx.createImageData(bw, bh)
      bufRef.current = buf
    }
    const out = buf.data

    // Per output column: source column + offset within the cell (precomputed).
    let colSrc = colSrcRef.current
    let colFrac = colFracRef.current
    if (!colSrc || colSrc.length !== bw) {
      colSrc = new Int32Array(bw)
      colFrac = new Int32Array(bw)
      colSrcRef.current = colSrc
      colFracRef.current = colFrac
    }
    for (let bx = 0; bx < bw; bx++) {
      const vcx = (bx / cellPx) | 0
      colSrc[bx] = vcx
      colFrac![bx] = bx - vcx * cellPx
    }

    const half = dotPx / 2
    const r2 = half * half
    for (let by = 0; by < bh; by++) {
      const vcy = (by / cellPx) | 0
      const fy = by - vcy * cellPx
      const orow = by * bw * 4
      if (fy >= dotPx) {
        out.fill(0, orow, orow + bw * 4) // gap row → transparent
        continue
      }
      const srow = vcy * cols
      const dy = fy - half
      const ady = dy < 0 ? -dy : dy
      for (let bx = 0; bx < bw; bx++) {
        const oi = orow + (bx << 2)
        const fx = colFrac![bx]
        let inside = false
        if (fx < dotPx) {
          if (dotShape === "square") {
            inside = true
          } else if (dotShape === "circle") {
            const dx = fx - half
            inside = dx * dx + dy * dy <= r2
          } else {
            const adx = fx < half ? half - fx : fx - half
            inside = adx + ady <= half
          }
        }
        if (inside) {
          const si = (srow + colSrc[bx]) << 2
          out[oi] = data[si]
          out[oi + 1] = data[si + 1]
          out[oi + 2] = data[si + 2]
          out[oi + 3] = 255
        } else {
          out[oi] = 0
          out[oi + 1] = 0
          out[oi + 2] = 0
          out[oi + 3] = 0
        }
      }
    }

    ctx.putImageData(buf, 0, 0)
  }, [])

  // Paint a uniform "screen off" frame (used before any video is loaded).
  const renderOff = useCallback(() => {
    const { width: cols, height: rows } = paramsRef.current
    const buf = new Uint8ClampedArray(cols * rows * 4)
    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = OFF_LEVEL
      buf[i + 1] = OFF_LEVEL
      buf[i + 2] = OFF_LEVEL
      buf[i + 3] = 255
    }
    render(buf)
  }, [render])

  // Bridge the imperative handle to `render`, keeping the last frame around.
  useImperativeHandle(
    ref,
    () => ({
      paint(data) {
        lastFrameRef.current = data
        render(data)
      },
    }),
    [render]
  )

  // Re-render the last frame (or the off state) when the look or frame size
  // changes, so adjusting controls or resizing updates immediately when paused.
  useEffect(() => {
    if (lastFrameRef.current) render(lastFrameRef.current)
    else renderOff()
  }, [width, height, gap, dotSize, shape, screenW, aspect, render, renderOff])

  const startResize = (e: ReactPointerEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = screenWRef.current
    const move = (ev: PointerEvent) => {
      setScreenW(Math.max(MIN_SCREEN_WIDTH, startW + (ev.clientX - startX)))
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  return (
    <div ref={outerRef} className="flex w-full justify-center">
      <div
        className="relative select-none"
        style={{ width: screenW, height: screenW / aspect }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
        <div
          onPointerDown={startResize}
          aria-label="Resize screen"
          className="absolute -right-1 -bottom-1 flex size-5 cursor-nwse-resize touch-none items-end justify-end"
        >
          <div className="size-3 rounded-xs border-r-2 border-b-2 border-primary" />
        </div>
      </div>
    </div>
  )
})
