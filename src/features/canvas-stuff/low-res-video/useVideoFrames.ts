import { useEffect, useRef } from "react"
import type { RefObject } from "react"

/**
 * Drives the downsample pipeline: each presented video frame is drawn into an
 * offscreen canvas at `width`×`height` (the GPU does the averaging for us) and
 * the raw RGBA bytes are handed to `onFrame`.
 *
 * Uses `requestVideoFrameCallback` when available (fires once per real video
 * frame, so it idles cheaply while paused) and falls back to rAF otherwise.
 * `onFrame` and the dimensions are read through refs so changing them never
 * tears down and rebuilds the loop.
 */
export function useVideoFrames(
  videoRef: RefObject<HTMLVideoElement | null>,
  width: number,
  height: number,
  onFrame: (data: Uint8ClampedArray) => void
) {
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  const sizeRef = useRef({ width, height })
  sizeRef.current = { width, height }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    let stopped = false

    const grab = () => {
      const { width: w, height: h } = sizeRef.current
      if (w < 1 || h < 1 || video.readyState < 2) return
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
      ctx.drawImage(video, 0, 0, w, h)
      onFrameRef.current(ctx.getImageData(0, 0, w, h).data)
    }

    if (typeof video.requestVideoFrameCallback === "function") {
      let id = video.requestVideoFrameCallback(function loop() {
        grab()
        if (!stopped) id = video.requestVideoFrameCallback(loop)
      })
      return () => {
        stopped = true
        video.cancelVideoFrameCallback(id)
      }
    }

    let raf = requestAnimationFrame(function loop() {
      if (!video.paused && !video.ended) grab()
      if (!stopped) raf = requestAnimationFrame(loop)
    })
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [videoRef])
}
