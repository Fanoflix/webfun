import { useEffect, useRef, useState } from "react"

import { Controls } from "./Controls"
import type { ScreenSettings } from "./Controls"
import { PixelScreen } from "./PixelScreen"
import type { DotShape, PixelScreenHandle } from "./PixelScreen"
import { useVideoFrames } from "./useVideoFrames"

const DEFAULT_SETTINGS: ScreenSettings = {
  width: 64,
  height: 36,
  gap: 2,
  dotSize: 3,
}

const WIDTH_RANGE = [8, 1920] as const
const HEIGHT_RANGE = [8, 1080] as const

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

export function LowResVideo() {
  const [settings, setSettings] = useState<ScreenSettings>(DEFAULT_SETTINGS)
  const [shape, setShape] = useState<DotShape>("circle")
  const [hasVideo, setHasVideo] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [lockAspect, setLockAspect] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const screenRef = useRef<PixelScreenHandle>(null)
  const urlRef = useRef<string | null>(null)
  // The video's native aspect ratio, once metadata has loaded.
  const aspectRef = useRef<number | null>(null)

  useVideoFrames(videoRef, settings.width, settings.height, (data) =>
    screenRef.current?.paint(data)
  )

  // Release the last object URL when we're done with it.
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    []
  )

  // Apply a settings change, deriving the dependent dimension from the video's
  // aspect ratio when the lock is on so the screen keeps the original shape.
  const applyPatch = (patch: Partial<ScreenSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch }
      const ar = aspectRef.current
      if (lockAspect && ar) {
        if (patch.width !== undefined) {
          next.height = clamp(Math.round(patch.width / ar), ...HEIGHT_RANGE)
        } else if (patch.height !== undefined) {
          next.width = clamp(Math.round(patch.height * ar), ...WIDTH_RANGE)
        }
      }
      return next
    })
  }

  const toggleLockAspect = () => {
    setLockAspect((locked) => {
      const nextLocked = !locked
      const ar = aspectRef.current
      // Snap to the original ratio the moment the lock is switched on.
      if (nextLocked && ar) {
        setSettings((s) => ({
          ...s,
          height: clamp(Math.round(s.width / ar), ...HEIGHT_RANGE),
        }))
      }
      return nextLocked
    })
  }

  const pickFile = (file: File) => {
    const video = videoRef.current
    if (!video) return
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const url = URL.createObjectURL(file)
    urlRef.current = url
    video.src = url
    void video.play().catch(() => {})
    setHasVideo(true)
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play().catch(() => {})
    else video.pause()
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8">
      <div
        className="relative grid place-items-center overflow-auto rounded-none bg-black p-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files.item(0)
          if (file && file.type.startsWith("video/")) pickFile(file)
        }}
      >
        <PixelScreen
          ref={screenRef}
          width={settings.width}
          height={settings.height}
          gap={settings.gap}
          dotSize={settings.dotSize}
          shape={shape}
        />
        {!hasVideo && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="text-xs tracking-widest text-white/50 uppercase">
              Drop a video or click upload
            </p>
          </div>
        )}
      </div>

      <Controls
        settings={settings}
        onChange={applyPatch}
        hasVideo={hasVideo}
        playing={playing}
        onTogglePlay={togglePlay}
        muted={muted}
        onToggleMute={toggleMute}
        lockAspect={lockAspect}
        onToggleLockAspect={toggleLockAspect}
        shape={shape}
        onShapeChange={setShape}
        onPickFile={pickFile}
      />

      <video
        ref={videoRef}
        className="hidden"
        muted={muted}
        playsInline
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          const video = e.currentTarget
          if (!video.videoWidth || !video.videoHeight) return
          const ar = video.videoWidth / video.videoHeight
          aspectRef.current = ar
          if (lockAspect) {
            setSettings((s) => ({
              ...s,
              height: clamp(Math.round(s.width / ar), ...HEIGHT_RANGE),
            }))
          }
        }}
      />
    </div>
  )
}
