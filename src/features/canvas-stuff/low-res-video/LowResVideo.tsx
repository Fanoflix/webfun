import { ToolIntro } from "@/components/layout/ToolIntro"
import { FileDropZone } from "@/components/upload/FileDropZone"
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
      <ToolIntro title="Low Res Video" className="w-full max-w-3xl">
        Throw away almost every pixel and you can still tell what you're looking
        at — your brain fills the rest back in. Same trick as a stadium
        scoreboard: up close it's a grid of dots, from far away it's a face.
      </ToolIntro>

      <FileDropZone
        accept="video/*"
        onPick={pickFile}
        empty={!hasVideo}
        hint="Drop a video, or click to upload"
        className="grid place-items-center overflow-auto bg-black p-4"
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
      </FileDropZone>

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
