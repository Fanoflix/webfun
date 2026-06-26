import { useEffect, useRef, useState } from "react"

import type { Region } from "@/components/loupe/region"
import type { DitherCanvasHandle } from "./DitherCanvas"
import { countUniqueColors, dither } from "./pipeline"
import type { DitherSettings } from "./pipeline"

const DEFAULT_SETTINGS: DitherSettings = {
  algorithm: "floyd",
  colorMode: "rgb",
  levels: 9,
  pixelScale: 1,
  contrast: 0,
  invert: false,
}

// The bounding box the result is displayed within (the backing buffer stays at
// full source resolution — the loupe is how you inspect it pixel-for-pixel).
const MAX_DISPLAY_W = 900
const MAX_DISPLAY_H = 600

// Side of the (square) loupe canvas, in device pixels.
const LOUPE_SIZE = 288

const MIN_ZOOM = 1
const MAX_ZOOM = 32

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

type Source = { url: string; w: number; h: number }

export type DitherStats = {
  /** Source image natural dimensions. */
  sourceW: number
  sourceH: number
  /** Working (dithered) resolution. */
  outW: number
  outH: number
  uniqueColors: number
}

/** Working resolution for a given source + pixel size (matches the dither). */
const workDims = (source: Source, pixelScale: number) => ({
  w: Math.max(1, Math.round(source.w / pixelScale)),
  h: Math.max(1, Math.round(source.h / pixelScale)),
})

/**
 * All of the dithering screen's state and behaviour: source image loading, the
 * (debounced) full-resolution dither → paint pipeline, the stats readout, the
 * loupe (a magnified view of a selectable region), and the derived display
 * size. The view binds `canvasRef`/`loupeRef` to canvases and renders the rest.
 *
 * The loupe selection is intentionally _derived_, not stored: we keep its
 * `center` and the `zoomLevel`, and compute a square region from them. That
 * makes the selection always 1:1 (so the square loupe is fully filled) and
 * locks its size to the zoom — a bigger selection means a lower zoom, and the
 * other way around.
 */
export function useDither() {
  const [settings, setSettings] = useState<DitherSettings>(DEFAULT_SETTINGS)
  const [source, setSource] = useState<Source | null>(null)
  const [comparing, setComparing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [stats, setStats] = useState<DitherStats | null>(null)
  // Normalised centre of the loupe selection; the square region is derived from
  // this plus the zoom (which fixes the side length).
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 })
  const [zoomLevel, setZoomLevel] = useState(8)
  // Bumped each time the main canvas is repainted, so the loupe can refresh.
  const [frameVersion, setFrameVersion] = useState(0)

  const imgRef = useRef<HTMLImageElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const canvasRef = useRef<DitherCanvasHandle>(null)
  const workRef = useRef<HTMLCanvasElement | null>(null)
  const loupeRef = useRef<HTMLCanvasElement>(null)

  // Release the last object URL on unmount.
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    []
  )

  // (Re)process whenever the source or any setting changes. Debounced so
  // dragging a slider doesn't run the pipeline on every intermediate value.
  useEffect(() => {
    const img = imgRef.current
    if (!source || !img) return

    const id = setTimeout(() => {
      const { w: workW, h: workH } = workDims(source, settings.pixelScale)

      const work = (workRef.current ??= document.createElement("canvas"))
      work.width = workW
      work.height = workH
      const ctx = work.getContext("2d", { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(img, 0, 0, workW, workH)
      const src = ctx.getImageData(0, 0, workW, workH)

      const out = dither(src, settings)
      canvasRef.current?.paint(out, workW, workH)
      setStats({
        sourceW: source.w,
        sourceH: source.h,
        outW: workW,
        outH: workH,
        uniqueColors: countUniqueColors(out),
      })
      setFrameVersion((v) => v + 1)
    }, 60)
    return () => clearTimeout(id)
  }, [source, settings])

  // The square selection, derived from the centre + zoom. The side (in working
  // pixels) is `LOUPE_SIZE / zoom`, clamped to fit the image; normalising it by
  // each axis keeps it a true square on screen (and in the source pixels).
  const dims = source ? workDims(source, settings.pixelScale) : null
  let region: Region = { x: 0.42, y: 0.42, w: 0.16, h: 0.16 }
  if (dims) {
    const maxSide = Math.min(dims.w, dims.h)
    const minSide = Math.min(LOUPE_SIZE / MAX_ZOOM, maxSide)
    const sideWork = clamp(LOUPE_SIZE / zoomLevel, minSide, maxSide)
    const w = sideWork / dims.w
    const h = sideWork / dims.h
    region = {
      x: clamp(center.x - w / 2, 0, 1 - w),
      y: clamp(center.y - h / 2, 0, 1 - h),
      w,
      h,
    }
  }

  // Redraw the loupe whenever the frame, the selection, or the compare state
  // changes. The selection is square, so it always fills the square loupe
  // exactly; nearest-neighbour keeps the dithered dots crisp under
  // magnification. While holding to compare we sample the original image
  // instead — same region, for a like-for-like before/after.
  useEffect(() => {
    const loupe = loupeRef.current
    const main = canvasRef.current?.getCanvas()
    const original = imgRef.current
    if (!loupe || !main || !source) return
    const d = workDims(source, settings.pixelScale)

    if (loupe.width !== LOUPE_SIZE) loupe.width = LOUPE_SIZE
    if (loupe.height !== LOUPE_SIZE) loupe.height = LOUPE_SIZE
    const ctx = loupe.getContext("2d")
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE)

    if (comparing && original) {
      ctx.drawImage(
        original,
        region.x * source.w,
        region.y * source.h,
        Math.max(1, region.w * source.w),
        Math.max(1, region.h * source.h),
        0,
        0,
        LOUPE_SIZE,
        LOUPE_SIZE
      )
    } else {
      ctx.drawImage(
        main,
        region.x * d.w,
        region.y * d.h,
        Math.max(1, region.w * d.w),
        Math.max(1, region.h * d.h),
        0,
        0,
        LOUPE_SIZE,
        LOUPE_SIZE
      )
    }
    // region is derived from these; depending on its parts keeps deps honest.
  }, [
    region.x,
    region.y,
    region.w,
    region.h,
    frameVersion,
    comparing,
    source,
    settings.pixelScale,
  ])

  const onChange = (patch: Partial<DitherSettings>) =>
    setSettings((s) => ({ ...s, ...patch }))

  // Move/resize the selection on the image. We only persist the centre; the
  // size is converted into a zoom level so the two stay locked together.
  const setRegion = (next: Region) => {
    setCenter({ x: next.x + next.w / 2, y: next.y + next.h / 2 })
    if (!dims) return
    const maxSide = Math.min(dims.w, dims.h)
    const minSide = Math.min(LOUPE_SIZE / MAX_ZOOM, maxSide)
    const sideWork = clamp(next.w * dims.w, minSide, maxSide)
    setZoomLevel(clamp(LOUPE_SIZE / sideWork, MIN_ZOOM, MAX_ZOOM))
  }

  // Zoom from the slider: clamped, with the selection re-derived around it.
  const setZoom = (value: number) =>
    setZoomLevel(clamp(value, MIN_ZOOM, MAX_ZOOM))

  const pickFile = (file: File) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const url = URL.createObjectURL(file)
    urlRef.current = url
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setSource({ url, w: img.naturalWidth, h: img.naturalHeight })
    }
    img.src = url
  }

  const exportPng = () => canvasRef.current?.exportPng("dithered.png")

  // Fit the result inside the display box, preserving the source aspect.
  const aspect = source ? source.w / source.h : 16 / 9
  let displayW = source ? Math.min(MAX_DISPLAY_W, MAX_DISPLAY_H * aspect) : 640
  let displayH = displayW / aspect
  if (displayH > MAX_DISPLAY_H) {
    displayH = MAX_DISPLAY_H
    displayW = displayH * aspect
  }

  return {
    settings,
    source,
    stats,
    comparing,
    collapsed,
    region,
    zoomLevel,
    canvasRef,
    loupeRef,
    displayWidth: Math.round(displayW),
    displayHeight: Math.round(displayH),
    onChange,
    pickFile,
    exportPng,
    setComparing,
    setCollapsed,
    setRegion,
    setZoomLevel: setZoom,
  }
}
