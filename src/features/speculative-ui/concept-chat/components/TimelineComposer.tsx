import {
  ChevronLeft,
  ChevronRight,
  Film,
  Image as ImageIcon,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { totalDurationMs } from "../engine/beats"
import type { Beat } from "../engine/beats"
import { HOLD_PRESETS } from "../engine/defaults"
import { formatCountdown, formatHold } from "../engine/time"
import type { TimelineComposerApi } from "../engine/useTimelineComposer"
import { TimelineMessage } from "./TimelineMessage"

/**
 * The composer, expanded.
 *
 * Everything above the input bar: what the beats are, which one is being edited,
 * and how long each holds. The *editing* still happens in the bar below — this
 * surface never grows a second text box, because the selected beat is that bar's
 * draft.
 *
 * Evenly-sized cards rather than a proportional ruler, on purpose. Widths that
 * encode duration turn this into a video timeline, which is the thing the whole
 * idea exists to avoid; a sequence of equal cards says "these happen in this
 * order", which is all a beat actually is.
 */
export function TimelineComposer({
  timeline,
}: {
  timeline: TimelineComposerApi
}) {
  const {
    beats,
    selectedIndex,
    select,
    addBeat,
    removeBeat,
    setHold,
    moveBeat,
    disable,
    preview,
    closePreview,
    previewMessage,
    previewKey,
  } = timeline

  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
        <span className="text-foreground">Timeline</span>
        <span className="min-w-0 flex-1 truncate">
          beat {selectedIndex + 1} of {beats.length} ·{" "}
          <span className="font-mono tabular-nums">
            {formatCountdown(totalDurationMs(beats))}
          </span>
        </span>

        {/* Reorder and delete act on the selection rather than living on every
            card. Six controls per beat is a toolbar; one set is a header. */}
        <HeaderButton
          label="Move beat earlier"
          disabled={selectedIndex === 0}
          onClick={() => moveBeat(selectedIndex, -1)}
        >
          <ChevronLeft className="size-3.5" />
        </HeaderButton>
        <HeaderButton
          label="Move beat later"
          disabled={selectedIndex === beats.length - 1}
          onClick={() => moveBeat(selectedIndex, 1)}
        >
          <ChevronRight className="size-3.5" />
        </HeaderButton>
        <HeaderButton
          label="Delete beat"
          onClick={() => removeBeat(selectedIndex)}
        >
          <Trash2 className="size-3" />
        </HeaderButton>

        <button
          type="button"
          onClick={previewKey === null ? preview : closePreview}
          className="flex items-center gap-1 px-1 tracking-wide transition-colors duration-150 hover:text-foreground"
        >
          <Play className="size-2.5 fill-current" />
          Preview
        </button>

        <HeaderButton label="Leave timeline mode" onClick={disable}>
          <X className="size-3.5" />
        </HeaderButton>
      </div>

      {/* The real message component, so what's checked here is what arrives —
          play button and all. Keyed so each press starts it over. */}
      {previewMessage !== null && (
        <div
          key={previewMessage.id}
          className="border-t border-border bg-background/40 px-3 py-2"
        >
          <TimelineMessage
            message={previewMessage}
            onFinish={() => {}}
            onBeatLand={() => {}}
          />
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto border-t border-border p-2">
        {beats.map((beat, index) => (
          <BeatCard
            key={beat.id}
            beat={beat}
            index={index}
            selected={index === selectedIndex}
            isLast={index === beats.length - 1}
            onSelect={() => select(index)}
            onRemove={() => removeBeat(index)}
            onCycleHold={() => setHold(index, nextHold(beat.hold))}
          />
        ))}

        <button
          type="button"
          onClick={addBeat}
          aria-label="Add beat"
          className="flex h-16 w-10 shrink-0 items-center justify-center border border-dashed border-border text-muted-foreground transition-colors duration-150 hover:border-foreground hover:text-foreground"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * One beat. The hold is its own control rather than part of the card, so picking
 * a duration doesn't first make you select a beat you didn't want to edit.
 */
function BeatCard({
  beat,
  index,
  selected,
  isLast,
  onSelect,
  onRemove,
  onCycleHold,
}: {
  beat: Beat
  index: number
  selected: boolean
  isLast: boolean
  onSelect: () => void
  onRemove: () => void
  onCycleHold: () => void
}) {
  const preset = HOLD_PRESETS.find((option) => option.ms === beat.hold)

  return (
    <div
      className={cn(
        "group/beat relative flex h-16 w-24 shrink-0 flex-col border",
        selected ? "border-foreground" : "border-border"
      )}
    >
      {/* On the card as well as in the header: the header acts on whatever's
          selected, which means throwing away a beat first requires selecting
          it — two steps and a moment of "wait, which one is this". */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove beat ${index + 1}`}
        className="absolute -top-px -right-px z-10 flex size-4 items-center justify-center border border-border bg-background text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/beat:opacity-100 hover:text-destructive focus-visible:opacity-100"
      >
        <X className="size-2.5" />
      </button>

      <button
        type="button"
        onClick={onSelect}
        aria-label={`Beat ${index + 1}`}
        aria-current={selected || undefined}
        className="flex min-h-0 flex-1 items-start gap-1 p-1.5 text-left"
      >
        <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
          {index + 1}
        </span>
        <BeatSummary beat={beat} />
      </button>

      {/* Nothing follows the last beat, so its hold would be a gap before
          nothing. Shown as absent rather than hidden, which would make the
          strip's cards different heights. */}
      <button
        type="button"
        onClick={onCycleHold}
        disabled={isLast}
        aria-label={`Hold for beat ${index + 1}`}
        className={cn(
          "flex shrink-0 items-baseline justify-between border-t px-1.5 py-0.5 text-[9px] transition-colors duration-150",
          selected ? "border-foreground" : "border-border",
          isLast
            ? "text-muted-foreground/40"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {isLast ? (
          <span>end</span>
        ) : (
          <>
            <span className="truncate">{preset?.label ?? "Custom"}</span>
            <span className="font-mono tabular-nums">
              {formatHold(beat.hold)}
            </span>
          </>
        )}
      </button>
    </div>
  )
}

/** A beat at a glance: its opening words, or what kind of media it is. */
function BeatSummary({ beat }: { beat: Beat }) {
  const text = beat.segments.find((segment) => segment.kind === "text")?.text
  const media = beat.segments.find((segment) => segment.kind !== "text")

  if (text === undefined && media === undefined) {
    return <span className="text-[10px] text-muted-foreground/60">empty</span>
  }

  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      {text !== undefined && (
        <span className="line-clamp-2 text-[10px] leading-tight break-words">
          {text}
        </span>
      )}
      {media !== undefined &&
        (media.kind === "gif" ? (
          <Film className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ImageIcon className="size-3 shrink-0 text-muted-foreground" />
        ))}
    </span>
  )
}

function HeaderButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center transition-colors duration-150",
        disabled ? "opacity-30" : "hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

/**
 * Cycles through the presets. A custom hold — which the model already allows and
 * an input will one day set — lands on the first preset rather than nowhere.
 */
function nextHold(current: number): number {
  const index = HOLD_PRESETS.findIndex((option) => option.ms === current)
  return HOLD_PRESETS[(index + 1) % HOLD_PRESETS.length].ms
}
