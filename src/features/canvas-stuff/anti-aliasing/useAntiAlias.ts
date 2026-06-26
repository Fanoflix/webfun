import { useEffect, useRef, useState } from "react"

import type { Region } from "@/components/loupe/region"
import type { AACanvasHandle } from "./AACanvas"
import { SCENE_ASPECT, render } from "./raster"
import type { AASettings } from "./raster"

const DEFAULT_SETTINGS: AASettings = {
  scene: "pentagon",
  samples: 4,
  angle: 18,
  size: 0.6,
  resolution: 200,
}

// Fixed on-screen size; the working buffer is scaled up (pixelated) to fill it,
// which is what makes the jaggies visible.
const DISPLAY_W = 720

// Side of the (square) loupe canvas, in device pixels.
const LOUPE_SIZE = 288
const MIN_ZOOM = 1
const MAX_ZOOM = 32
// Degrees advanced per animation frame when spinning.
const SPIN_SPEED = 0.4

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

/** Working resolution for the chosen base width (height from the scene aspect). */
const workDims = (resolution: number) => ({
  w: Math.max(1, Math.round(resolution)),
  h: Math.max(1, Math.round(resolution / SCENE_ASPECT)),
})

/**
 * All of the anti-aliasing screen's state and behaviour: scene/SSAA settings,
 * the (optional) spin animation, the dual render (anti-aliased + aliased) that
 * powers hold-to-compare, the export, and the loupe (a magnified, square,
 * zoom-locked selection). The view binds `canvasRef`/`loupeRef` and renders the
 * rest — it holds no logic of its own.
 */
export function useAntiAlias() {
  const [settings, setSettings] = useState<AASettings>(DEFAULT_SETTINGS)
  const [comparing, setComparing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 })
  const [zoomLevel, setZoomLevel] = useState(8)
  // Bumped after each repaint so the loupe refreshes.
  const [frameVersion, setFrameVersion] = useState(0)

  const canvasRef = useRef<AACanvasHandle>(null)
  const loupeRef = useRef<HTMLCanvasElement>(null)

  // Re-render whenever the scene or any setting changes. The rasteriser is cheap
  // at these resolutions, so no debounce — that also lets the spin animate.
  useEffect(() => {
    const { w, h } = workDims(settings.resolution)
    canvasRef.current?.paint(render(w, h, settings), w, h)
    canvasRef.current?.paintCompare(
      render(w, h, { ...settings, samples: 1 }),
      w,
      h
    )
    setFrameVersion((v) => v + 1)
  }, [settings])

  // Spin: advance the angle each frame while animating; the render effect above
  // reacts to the resulting settings change.
  useEffect(() => {
    if (!animating) return
    let raf = requestAnimationFrame(function loop() {
      setSettings((s) => ({ ...s, angle: (s.angle + SPIN_SPEED) % 360 }))
      raf = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(raf)
  }, [animating])

  // The square selection, derived from the centre + zoom (so the selection is
  // always 1:1 and its size is locked to the zoom). See the dithering loupe.
  const dims = workDims(settings.resolution)
  const maxSide = Math.min(dims.w, dims.h)
  const minSide = Math.min(LOUPE_SIZE / MAX_ZOOM, maxSide)
  const sideWork = clamp(LOUPE_SIZE / zoomLevel, minSide, maxSide)
  const rw = sideWork / dims.w
  const rh = sideWork / dims.h
  const region: Region = {
    x: clamp(center.x - rw / 2, 0, 1 - rw),
    y: clamp(center.y - rh / 2, 0, 1 - rh),
    w: rw,
    h: rh,
  }

  // Redraw the loupe on any change. The selection is square so it fills the
  // square loupe exactly; nearest-neighbour keeps pixels crisp. While comparing
  // we sample the aliased canvas for a like-for-like before/after.
  useEffect(() => {
    const loupe = loupeRef.current
    const source = comparing
      ? canvasRef.current?.getCompareCanvas()
      : canvasRef.current?.getCanvas()
    if (!loupe || !source) return
    const d = workDims(settings.resolution)

    if (loupe.width !== LOUPE_SIZE) loupe.width = LOUPE_SIZE
    if (loupe.height !== LOUPE_SIZE) loupe.height = LOUPE_SIZE
    const ctx = loupe.getContext("2d")
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE)
    ctx.drawImage(
      source,
      region.x * d.w,
      region.y * d.h,
      Math.max(1, region.w * d.w),
      Math.max(1, region.h * d.h),
      0,
      0,
      LOUPE_SIZE,
      LOUPE_SIZE
    )
    // region is derived from these; depending on its parts keeps deps honest.
  }, [
    region.x,
    region.y,
    region.w,
    region.h,
    frameVersion,
    comparing,
    settings.resolution,
  ])

  const onChange = (patch: Partial<AASettings>) =>
    setSettings((s) => ({ ...s, ...patch }))

  // Move/resize the selection on the canvas; size is converted to a zoom level
  // so the two stay locked together.
  const setRegion = (next: Region) => {
    setCenter({ x: next.x + next.w / 2, y: next.y + next.h / 2 })
    const sw = clamp(next.w * dims.w, minSide, maxSide)
    setZoomLevel(clamp(LOUPE_SIZE / sw, MIN_ZOOM, MAX_ZOOM))
  }

  const setZoom = (value: number) =>
    setZoomLevel(clamp(value, MIN_ZOOM, MAX_ZOOM))

  const exportPng = () => canvasRef.current?.exportPng("anti-aliasing.png")

  // The display box keeps the scene aspect at a fixed presentation size.
  const displayWidth = DISPLAY_W
  const displayHeight = Math.round(DISPLAY_W / SCENE_ASPECT)

  return {
    settings,
    comparing,
    collapsed,
    animating,
    region,
    zoomLevel,
    canvasRef,
    loupeRef,
    displayWidth,
    displayHeight,
    onChange,
    exportPng,
    setComparing,
    setCollapsed,
    setAnimating,
    setRegion,
    setZoomLevel: setZoom,
  }
}
