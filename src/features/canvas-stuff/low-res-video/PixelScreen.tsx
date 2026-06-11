import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react"
import type { Ref } from "react"

export type DotShape = "circle" | "square" | "diamond"

export type PixelScreenHandle = {
  /** Push a fresh RGBA buffer (length `width*height*4`) onto the screen. */
  paint: (data: Uint8ClampedArray) => void
}

// "Screen off" dot colour, shown before a video is loaded.
const OFF_LEVEL = 20

// The displayed screen can grow without limit (it scrolls), but the canvas
// backing store is bounded so we never allocate a huge buffer and crash. When
// the layout exceeds these, we draw scaled into a smaller backing and let CSS
// stretch it back up — the dots stay discrete, just slightly softer.
const MAX_BACKING_SIDE = 8192
const MAX_BACKING_PIXELS = 16_000_000

// Bounding box the on-screen canvas is contained within. It grows with the dots
// up to this size, then scales down uniformly (gaps and dots shrink together).
// This is the single place to tune the screen's footprint — any CSS length.
const MAX_DISPLAY_WIDTH = "1920px"
const MAX_DISPLAY_HEIGHT = "1080px"

type Props = {
  width: number
  height: number
  gap: number
  dotSize: number
  shape: DotShape
  ref?: Ref<PixelScreenHandle>
}

/**
 * The virtual screen: a `width`×`height` grid of dots, one per pixel, rendered
 * to a single `<canvas>`.
 *
 * Every dot is always drawn as its own shape with the configured gap, at any
 * resolution — there is no "switch to a smooth image" fast path. Drawing is
 * imperative (via `paint`) straight from the per-frame RGBA buffer, so video
 * playback never triggers a React re-render. Using one canvas instead of N DOM
 * nodes is what keeps huge grids from crashing the page.
 */
export const PixelScreen = memo(function PixelScreen({
  width,
  height,
  gap,
  dotSize,
  shape,
  ref,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Latest render params, read by `render` without re-subscribing each frame.
  const paramsRef = useRef({ width, height, gap, dotSize, shape })
  paramsRef.current = { width, height, gap, dotSize, shape }
  // Last painted frame, so tweaking controls while paused updates instantly.
  const lastFrameRef = useRef<Uint8ClampedArray | null>(null)

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

    // Full on-screen size — grows with gap & dot size; the container scrolls.
    const cell = dot + gapPx
    const layoutW = cols * cell - gapPx
    const layoutH = rows * cell - gapPx

    // Scale the backing store down only if the layout is enormous, so we never
    // allocate a giant buffer. The CSS size below stays at the full layout size.
    const scale = Math.min(
      1,
      MAX_BACKING_SIDE / layoutW,
      MAX_BACKING_SIDE / layoutH,
      Math.sqrt(MAX_BACKING_PIXELS / (layoutW * layoutH))
    )
    const backingW = Math.max(1, Math.round(layoutW * scale))
    const backingH = Math.max(1, Math.round(layoutH * scale))

    // The canvas intrinsic size (its backing) carries the layout aspect ratio;
    // CSS (max-w / max-h) then scales the whole thing down uniformly to fit the
    // bounding box, so dots and gaps shrink together — the ratio is preserved.
    if (canvas.width !== backingW) canvas.width = backingW
    if (canvas.height !== backingH) canvas.height = backingH

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, backingW, backingH)
    ctx.scale(scale, scale) // draw in layout coordinates, auto-fit to backing

    const half = dot / 2
    for (let r = 0; r < rows; r++) {
      const y = r * cell
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 4
        ctx.fillStyle = `rgb(${data[i]} ${data[i + 1]} ${data[i + 2]})`
        const x = c * cell
        if (dotShape === "square") {
          ctx.fillRect(x, y, dot, dot)
        } else if (dotShape === "circle") {
          ctx.beginPath()
          ctx.arc(x + half, y + half, half, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.moveTo(x + half, y)
          ctx.lineTo(x + dot, y + half)
          ctx.lineTo(x + half, y + dot)
          ctx.lineTo(x, y + half)
          ctx.closePath()
          ctx.fill()
        }
      }
    }
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

  // Re-render the last frame (or the off state) when the look changes, so
  // adjusting shape/gap/dot size/dimensions updates immediately even if paused.
  useEffect(() => {
    if (lastFrameRef.current) render(lastFrameRef.current)
    else renderOff()
  }, [width, height, gap, dotSize, shape, render, renderOff])

  return (
    <canvas
      ref={canvasRef}
      className="block [image-rendering:pixelated]"
      style={{
        maxWidth: `min(100%, ${MAX_DISPLAY_WIDTH})`,
        maxHeight: MAX_DISPLAY_HEIGHT,
      }}
    />
  )
})
