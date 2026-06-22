import { useEffect, useRef, useState } from "react"

import type { DitherCanvasHandle } from "./DitherCanvas"
import { countUniqueColors, dither } from "./pipeline"
import type { DitherSettings } from "./pipeline"

const DEFAULT_SETTINGS: DitherSettings = {
  algorithm: "floyd",
  colorMode: "grayscale",
  levels: 2,
  pixelScale: 3,
  contrast: 0,
  invert: false,
}

// Longest side of the working buffer before `pixelScale` divides it further,
// and the bounding box the result is displayed within.
const MAX_WORK = 1000
const MAX_DISPLAY_W = 900
const MAX_DISPLAY_H = 600

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

/**
 * All of the dithering screen's state and behaviour: source image loading, the
 * (debounced) downsample → dither → paint pipeline, the stats readout, and the
 * derived display size. The view binds `canvasRef` to the canvas and renders
 * everything else from the returned values.
 */
export function useDither() {
  const [settings, setSettings] = useState<DitherSettings>(DEFAULT_SETTINGS)
  const [source, setSource] = useState<Source | null>(null)
  const [comparing, setComparing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [stats, setStats] = useState<DitherStats | null>(null)

  const imgRef = useRef<HTMLImageElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const canvasRef = useRef<DitherCanvasHandle>(null)
  const workRef = useRef<HTMLCanvasElement | null>(null)

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
      const baseScale = Math.min(1, MAX_WORK / Math.max(source.w, source.h))
      const workW = Math.max(
        1,
        Math.round((source.w * baseScale) / settings.pixelScale)
      )
      const workH = Math.max(
        1,
        Math.round((source.h * baseScale) / settings.pixelScale)
      )

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
    }, 60)
    return () => clearTimeout(id)
  }, [source, settings])

  const onChange = (patch: Partial<DitherSettings>) =>
    setSettings((s) => ({ ...s, ...patch }))

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
    canvasRef,
    displayWidth: Math.round(displayW),
    displayHeight: Math.round(displayH),
    onChange,
    pickFile,
    exportPng,
    setComparing,
    setCollapsed,
  }
}
