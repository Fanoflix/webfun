import { Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react"

import { cn } from "@/lib/utils"

type Props = {
  playing: boolean
  onTogglePlay: () => void
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  muted: boolean
  onToggleMute: () => void
  volume: number
  onVolumeChange: (volume: number) => void
  className?: string
}

/**
 * The transport bar, overlaid on the bottom of the screen where a video
 * player's controls belong.
 *
 * These used to live in the settings panel on the right, mixed in with columns
 * and dot size — which put "scrub the video" and "change the grid resolution"
 * in the same list, at opposite ends of the screen from the thing they act on.
 * Playback is about the picture, so it sits on the picture.
 *
 * It fades in on hover, and on focus too: keyboard users never trigger hover,
 * and a control you can tab to but not see is worse than one that isn't there.
 * `pointer-events` follow the fade so the hidden bar can't swallow a drag meant
 * for the screen's resize handle.
 */
export function VideoTransport({
  playing,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  muted,
  onToggleMute,
  volume,
  onVolumeChange,
  className,
}: Props) {
  const max = duration || 0
  const VolumeIcon =
    muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <div
      className={cn(
        // pr-10 leaves the bottom-right corner to the screen's resize handle.
        "absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 py-2 pr-10 pl-3",
        "bg-gradient-to-t from-black/85 to-transparent pb-3",
        "opacity-0 transition-opacity duration-200 group-hover:opacity-100",
        "focus-within:opacity-100",
        "pointer-events-none [&_button]:pointer-events-auto [&_input]:pointer-events-auto",
        className
      )}
    >
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="grid size-7 shrink-0 place-items-center text-white/70 hover:text-white"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>

      <span className="w-9 shrink-0 text-right text-xs text-white/70 tabular-nums">
        {formatTime(currentTime)}
      </span>

      <input
        type="range"
        min={0}
        max={max}
        step={0.01}
        value={Math.min(currentTime, max)}
        onChange={(e) => onSeek(e.target.valueAsNumber)}
        aria-label="Seek"
        className="h-1 min-w-0 flex-1 cursor-pointer accent-primary"
      />

      <span className="w-9 shrink-0 text-xs text-white/70 tabular-nums">
        {formatTime(duration)}
      </span>

      {/* Grouped so the button and slider read as one control, and so the
          slider can stay narrow without looking orphaned. */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          className="grid size-7 place-items-center text-white/70 hover:text-white"
        >
          <VolumeIcon className="size-4" />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          // Muted reads as zero even though the level is remembered, so the
          // slider never disagrees with what you can hear.
          value={muted ? 0 : volume}
          onChange={(e) => onVolumeChange(e.target.valueAsNumber)}
          aria-label="Volume"
          className="h-1 w-20 cursor-pointer accent-primary"
        />
      </div>
    </div>
  )
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
