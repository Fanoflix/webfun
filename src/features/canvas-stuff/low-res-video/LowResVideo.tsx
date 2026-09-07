import { ToolIntro } from "@/components/layout/ToolIntro"
import { FileDropZone } from "@/components/upload/FileDropZone"
import { Controls } from "./Controls"
import { PixelScreen } from "./PixelScreen"
import { VideoTransport } from "./VideoTransport"
import { useLowResVideo } from "./useLowResVideo"

export function LowResVideo() {
  const {
    settings,
    shape,
    hasVideo,
    playing,
    muted,
    volume,
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
    setVolume,
  } = useLowResVideo()

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <ToolIntro title="Low Res Video" className="w-full max-w-3xl">
        Throw away almost every pixel and you can still tell what you're looking
        at — your brain fills the rest back in. Same trick as a stadium
        scoreboard: up close it's a grid of dots, from far away it's a face.
      </ToolIntro>

      {/* The transport rides *inside* the screen container rather than sitting
          under it: the screen is resizable, and a sibling bar either forced a
          fixed width on the whole thing or overflowed once the screen grew past
          it. As an overlay it simply tracks whatever size the screen is. */}
      <FileDropZone
        accept="video/*"
        onPick={pickFile}
        empty={!hasVideo}
        hint="Drop a video, or click to upload"
        className="group grid place-items-center overflow-auto bg-black p-4"
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

        {hasVideo && (
          <VideoTransport
            playing={playing}
            onTogglePlay={togglePlay}
            currentTime={currentTime}
            duration={duration}
            onSeek={seek}
            muted={muted}
            onToggleMute={toggleMute}
            volume={volume}
            onVolumeChange={setVolume}
          />
        )}
      </FileDropZone>

      <Controls
        settings={settings}
        onChange={onChange}
        hasVideo={hasVideo}
        lockAspect={lockAspect}
        onToggleLockAspect={toggleLockAspect}
        shape={shape}
        onShapeChange={setShape}
        onPickFile={pickFile}
      />

      <video ref={videoRef} className="hidden" playsInline loop muted />
    </div>
  )
}
