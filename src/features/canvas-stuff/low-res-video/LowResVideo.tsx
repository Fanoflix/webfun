import { Controls } from "./Controls"
import { PixelScreen } from "./PixelScreen"
import { useLowResVideo } from "./useLowResVideo"

export function LowResVideo() {
  const {
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
  } = useLowResVideo()

  return (
    <div className="flex w-full flex-col items-center gap-8">
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
          aspect={videoAspect}
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
        onChange={onChange}
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
        currentTime={currentTime}
        duration={duration}
        onSeek={seek}
      />

      <video ref={videoRef} className="hidden" playsInline loop muted />
    </div>
  )
}
