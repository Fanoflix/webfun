import { useImperativeHandle, useRef } from "react"
import type { PointerEvent as ReactPointerEvent, ReactNode, Ref } from "react"

export type DitherCanvasHandle = {
  /** Push a processed RGBA buffer (`w*h*4`) onto the screen. */
  paint: (data: Uint8ClampedArray, w: number, h: number) => void
  /** Download the last painted frame as a PNG. */
  exportPng: (filename: string) => void
  /** The backing canvas, so the loupe can sample its pixels. */
  getCanvas: () => HTMLCanvasElement | null
}

type Props = {
  /** Object URL of the source image, shown while comparing. */
  originalUrl: string | null
  comparing: boolean
  displayWidth: number
  displayHeight: number
  onHoldStart: () => void
  onHoldEnd: () => void
  /** Overlays positioned over the image (e.g. the loupe selection). */
  children?: ReactNode
  ref?: Ref<DitherCanvasHandle>
}

/**
 * Renders the dithered result on a canvas whose backing store is the working
 * resolution; CSS scales it up with nearest-neighbour (`pixelated`) so the dots
 * stay crisp. Holding the pointer over it reveals the original image overlay.
 */
export function DitherCanvas({
  originalUrl,
  comparing,
  displayWidth,
  displayHeight,
  onHoldStart,
  onHoldEnd,
  children,
  ref,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useImperativeHandle(
    ref,
    () => ({
      getCanvas: () => canvasRef.current,
      paint(data, w, h) {
        const canvas = canvasRef.current
        if (!canvas || w < 1 || h < 1) return
        if (canvas.width !== w) canvas.width = w
        if (canvas.height !== h) canvas.height = h
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const img = ctx.createImageData(w, h)
        img.data.set(data)
        ctx.putImageData(img, 0, 0)
      },
      exportPng(filename) {
        const canvas = canvasRef.current
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
        ref={canvasRef}
        className="block h-full w-full [image-rendering:pixelated]"
      />
      {originalUrl && (
        <img
          src={originalUrl}
          alt="Original"
          draggable={false}
          hidden={!comparing}
          className="pointer-events-none absolute inset-0 h-full w-full object-fill"
        />
      )}
      {children}
    </div>
  )
}
