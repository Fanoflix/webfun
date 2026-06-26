import { useEffect, useRef, useState } from "react"

import type { ScreenSettings } from "./Controls"
import type { DotShape, PixelScreenHandle } from "./PixelScreen"
import { useVideoFrames } from "./useVideoFrames"

const DEFAULT_SETTINGS: ScreenSettings = {
  width: 64,
  height: 36,
  gap: 2,
  dotSize: 3,
}

const WIDTH_RANGE = [8, 1200] as const
const HEIGHT_RANGE = [8, 800] as const

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

/**
 * All of the low-res-video screen's state and behaviour: the dot-grid settings
 * (with optional aspect-ratio locking), video loading/seeking/playback, and the
 * frame-grab loop that feeds the {@link PixelScreen}. The view binds `videoRef`
 * and `screenRef` and renders the rest — it holds no logic of its own.
 */
export function useLowResVideo() {
  const [settings, setSettings] = useState<ScreenSettings>(DEFAULT_SETTINGS)
  const [shape, setShape] = useState<DotShape>("circle")
  const [hasVideo, setHasVideo] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [lockAspect, setLockAspect] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [videoAspect, setVideoAspect] = useState(16 / 9)

  const videoRef = useRef<HTMLVideoElement>(null)
  const screenRef = useRef<PixelScreenHandle>(null)
  const urlRef = useRef<string | null>(null)
  // The video's native aspect ratio, once metadata has loaded.
  const aspectRef = useRef<number | null>(null)
  // Read inside the (mount-only) metadata listener without re-subscribing.
  const lockAspectRef = useRef(lockAspect)
  lockAspectRef.current = lockAspect

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

  // Keep the element's muted property in sync with state (also satisfies the
  // autoplay policy, since the default state is muted).
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  // Subscribe to the video element's events once; state setters are stable and
  // the live lock flag is read through a ref.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime = () => setCurrentTime(video.currentTime)
    const onDuration = () => setDuration(video.duration || 0)
    const onMeta = () => {
      if (!video.videoWidth || !video.videoHeight) return
      const ar = video.videoWidth / video.videoHeight
      aspectRef.current = ar
      setVideoAspect(ar)
      if (lockAspectRef.current) {
        setSettings((s) => ({
          ...s,
          height: clamp(Math.round(s.width / ar), ...HEIGHT_RANGE),
        }))
      }
    }

    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPause)
    video.addEventListener("timeupdate", onTime)
    video.addEventListener("durationchange", onDuration)
    video.addEventListener("loadedmetadata", onMeta)
    return () => {
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPause)
      video.removeEventListener("timeupdate", onTime)
      video.removeEventListener("durationchange", onDuration)
      video.removeEventListener("loadedmetadata", onMeta)
    }
  }, [])

  // Apply a settings change, deriving the dependent dimension from the video's
  // aspect ratio when the lock is on so the screen keeps the original shape.
  const onChange = (patch: Partial<ScreenSettings>) => {
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
    setCurrentTime(0)
  }

  const seek = (time: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = time
    setCurrentTime(time)
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play().catch(() => {})
    else video.pause()
  }

  const toggleMute = () => setMuted((m) => !m)

  return {
    settings,
    shape,
    hasVideo,
    playing,
    muted,
    lockAspect,
    currentTime,
    duration,
    videoAspect,
    videoRef,
    screenRef,
    onChange,
    setShape,
    toggleLockAspect,
    pickFile,
    seek,
    togglePlay,
    toggleMute,
  }
}
