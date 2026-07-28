import { Play, RotateCcw } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { useCallback, useMemo, useRef } from "react"

import { toBeats, totalDurationMs } from "../engine/beats"
import type { Beat } from "../engine/beats"
import { BEAT_ENTERS } from "../engine/beatEnters"
import { CHAT_EASE } from "../engine/defaults"
import { formatCountdown } from "../engine/time"
import type { Message } from "../engine/types"
import { useTimelinePlayback } from "../engine/useTimelinePlayback"
import { SegmentView } from "./SegmentView"

/**
 * A message that performs itself.
 *
 * Beats **accumulate** — each one lands on a new line beneath the last and stays
 * there, so when it finishes the whole message is sitting in the thread readable
 * like any other. Nothing is replaced, which is what keeps this a message rather
 * than a video player: there is no scrub bar, no lost content, and nothing on
 * screen at once that wasn't put there in order.
 *
 * The first beat is always visible. It's the poster — the hook you decide to press
 * play on — so playing continues from beat two instead of restarting from black.
 */
export function TimelineMessage({
  message,
  onFinish,
  onBeatLand,
}: {
  message: Message
  /** Fired once a play reaches the end, so the thread can remember it. */
  onFinish: (messageId: string) => void
  /** Fired as each beat lands, so the thread can keep itself scrolled. */
  onBeatLand: () => void
}) {
  const beats = useMemo(() => toBeats(message.body), [message.body])
  const reduced = useReducedMotion()

  const finish = useCallback(() => onFinish(message.id), [message.id, onFinish])

  const { phase, visibleCount, play, replay } = useTimelinePlayback(beats, {
    initiallyDone: message.played === true,
    onBeatLand,
    onFinish: finish,
  })

  /**
   * Beats present at mount don't animate, for the same reason seeded messages
   * don't: a message that already played comes back whole, and unfurling its
   * history on every reload is noise. Anything past this index arrived by playing.
   */
  const mountedCount = useRef(visibleCount).current

  /**
   * Reduced motion gets the message, just not the performance — which is exactly
   * the v0 renderer, and readable in full without pressing anything.
   */
  if (reduced) {
    return (
      <div className="space-y-1">
        {message.body.map((segment, i) => (
          <SegmentView key={i} segment={segment} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {beats.slice(0, visibleCount).map((beat, index) => (
        <BeatView key={beat.id} beat={beat} animates={index >= mountedCount} />
      ))}

      {phase === "idle" && (
        <PlayButton durationMs={totalDurationMs(beats)} onPlay={play} />
      )}
      {phase === "done" && <ReplayButton onReplay={replay} />}
    </div>
  )
}

/**
 * **Animation 1, reused.** A landing beat grows from zero height, pushing the
 * thread up — the same motion a new message makes, because to the person watching
 * it *is* a new message arriving.
 *
 * The beat's `enter` rides on top of that, with its own duration: making room and
 * appearing are two different things and want different timing.
 */
function BeatView({ beat, animates }: { beat: Beat; animates: boolean }) {
  const enter = BEAT_ENTERS[beat.enter]

  return (
    <motion.div
      data-slot="beat"
      initial={animates ? { height: 0, ...enter.initial } : false}
      animate={{ height: "auto", ...enter.animate }}
      transition={
        animates
          ? {
              height: { duration: 0.25, ease: CHAT_EASE },
              default: { duration: enter.duration, ease: CHAT_EASE },
            }
          : { duration: 0 }
      }
      className="space-y-1 overflow-hidden"
    >
      {beat.segments.map((segment, i) => (
        <SegmentView key={i} segment={segment} />
      ))}
    </motion.div>
  )
}

/**
 * The whole affordance: this message is meant to be watched, and here's how long
 * it takes. Nothing autoplays — choosing to press it is the anticipation the idea
 * runs on.
 *
 * It says what it is in words rather than trusting a `▶` to carry the idea alone.
 * A play button on a *message* is the one thing here nobody has seen before, and
 * a visitor who doesn't press it never finds out what any of this was for.
 */
function PlayButton({
  durationMs,
  onPlay,
}: {
  durationMs: number
  onPlay: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label="Play message"
      className="mt-1.5 flex items-center gap-2 border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors duration-150 hover:border-foreground hover:text-foreground"
    >
      <Play className="size-2.5 fill-current" />
      <span>This message is playable</span>
      <span className="font-mono tabular-nums opacity-60">
        {formatCountdown(durationMs)}
      </span>
    </button>
  )
}

/**
 * Kept visible rather than revealed on hover: a performance you can't obviously
 * watch again is a performance you only half-watched the first time.
 */
function ReplayButton({ onReplay }: { onReplay: () => void }) {
  return (
    <button
      type="button"
      onClick={onReplay}
      className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors duration-150 hover:text-foreground"
    >
      <RotateCcw className="size-2.5" />
      Replay
    </button>
  )
}
