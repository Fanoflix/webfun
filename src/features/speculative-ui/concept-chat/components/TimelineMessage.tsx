import { Activity, Play, RotateCcw } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useCallback, useMemo, useRef } from "react"

import { toBeats, totalDurationMs } from "../engine/beats"
import type { Beat } from "../engine/beats"
import { BEAT_ENTERS } from "../engine/beatEnters"
import { BEAT_REWIND_MS, CHAT_EASE, REST_SETTLE_MS } from "../engine/defaults"
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

  const { phase, visibleCount, runId, fromCleared, play, replay } =
    useTimelinePlayback(beats, {
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

  const running = phase === "playing" || phase === "rewinding"

  return (
    <div
      data-slot="timeline-message"
      data-phase={phase}
      className="relative space-y-1"
    >
      <Rail
        running={running}
        stopsAtReplay={phase === "done"}
        pulseKey={phase === "done" ? runId : null}
      />

      {/* The first beat is the poster and never leaves, so it sits outside
          `AnimatePresence` — inside, a run's re-key would mount the new copy
          while the old one was still animating out, and the message would
          briefly show the same line twice. */}
      {visibleCount > 0 && beats.length > 0 && (
        <BeatView
          // Keyed by run, so starting one re-mounts it and it fades in again
          // rather than sitting inert while everything after it performs.
          key={`${runId}-${beats[0].id}`}
          beat={beats[0]}
          // Only skip the height when it's arriving over a poster of its own
          // size. A replay wound the message away to nothing first, so there's
          // no poster to match and it grows in like every other beat.
          overPoster={!fromCleared}
          animates={runId > 0}
        />
      )}

      {/* Exits are what make a replay wind back rather than blink out. */}
      <AnimatePresence initial={false}>
        {beats.slice(1, visibleCount).map((beat, index) => (
          <BeatView
            key={`${runId}-${beat.id}`}
            beat={beat}
            overPoster={false}
            animates={runId > 0 || index + 1 >= mountedCount}
          />
        ))}
      </AnimatePresence>

      {phase === "idle" && (
        <PlayButton durationMs={totalDurationMs(beats)} onPlay={play} />
      )}
      {phase === "done" && <ReplayButton onReplay={replay} />}
    </div>
  )
}

/**
 * The glyph that marks a message as one that performs itself.
 *
 * Named once because it's drawn twice — once resting, once as the copy that
 * flashes when a message finishes — and the two must never disagree. Swapping
 * the icon is this line and nothing else.
 */
const RailIcon = Activity

/** Shared by every copy so the flashes land exactly on top of the resting one. */
const RAIL_ICON_BOX = "absolute top-4 -left-7.5 size-4"

/** The same glyph repeated at the foot of the rail, beside the replay control. */
const REPLAY_ICON_BOX = "absolute top-0 -left-7.75 size-4"

/**
 * One end-to-end pass of the loader segment, in seconds.
 *
 * The segment ping-pongs, so it only arrives back at the glyph every *two*
 * passes — that's the cycle everything below is timed against.
 */
const LOADER_SWEEP_S = 0.9

/** Glyph to far end and back. The segment is at the glyph once per cycle. */
const LOADER_CYCLE_S = LOADER_SWEEP_S * 2

/**
 * The single flash, as a set of motion props.
 *
 * Held here rather than inlined because three things fire it — the rail, the
 * glyph at its head and the glyph beside the replay control — and a full stop
 * that arrives in three instalments isn't a full stop.
 */
const PULSE = {
  initial: { opacity: 0 },
  animate: { opacity: [0, 1, 0] },
  transition: {
    duration: 2.15,
    delay: REST_SETTLE_MS / 1_000,
    ease: CHAT_EASE,
  },
}

/**
 * How long the glyph's flash lasts, each time the segment arrives at it.
 *
 * Independent of how *often* it fires — that's `LOADER_CYCLE_S`. A short flash
 * inside a long cycle reads as the mark being struck; stretching it to fill the
 * cycle turns it into a slow breathe, which says "waiting" rather than
 * "something just happened".
 */
const ICON_FLASH_S = 0.6

/**
 * The gutter rail: both the mark that says "this one performs itself" and the
 * loader while it does.
 *
 * It's present from the moment the message arrives, through the play, and after
 * it rests — a played message that loses its mark becomes indistinguishable
 * from the plain text around it, which throws away the fact that it *was* a
 * performance.
 *
 * While running, a segment travels it. Deliberately indeterminate rather than a
 * progress bar: progress invites you to watch the bar and predict the end,
 * where this only says something is still coming — which is the anticipation
 * the whole idea trades on. Reusing the mark as the loader also means playing
 * adds no new element to the message, so nothing reflows when you press play.
 *
 * Absolutely positioned in space that was already empty, so none of this costs
 * any layout.
 */
function Rail({
  running,
  stopsAtReplay,
  pulseKey,
}: {
  running: boolean
  /** Non-null once the message has finished; changes per run so a replay re-fires. */
  pulseKey: number | null
  /**
   * At rest the rail stops short of the replay row rather than running to the
   * bottom, leaving the glyph that sits beside that control clear of the line
   * instead of struck through by it.
   */
  stopsAtReplay: boolean
}) {
  const reduced = useReducedMotion()

  return (
    <>
      {/* The glyph sits outside the line rather than inside it: the line clips
          its own contents so the travelling segment can't escape, and anything
          hung off it would be clipped too.

          Offset up and to the left so it reads as a label *on* the rail rather
          than a notch *in* it, and drawn in the rail's own colour — it marks the
          message, it isn't a second control competing with the real play
          button below. */}
      <span aria-hidden className={`${RAIL_ICON_BOX} text-foreground/10`}>
        <RailIcon className="stroke-1.25 size-full" />
      </span>

      {/* The glyph pulses by stacking a full-contrast copy over the resting one
          and fading it through, rather than animating the colour. Colour
          animation would have to name a value, and no single one is right in
          both themes; a second copy inherits whatever `text-foreground` means
          wherever it lands. The overlay `Pulse` used on the bars can't work
          here either — it paints a rectangle, which over an outlined glyph is
          just a box. */}
      {pulseKey !== null && !reduced && (
        <motion.span
          key={pulseKey}
          aria-hidden
          className={`${RAIL_ICON_BOX} text-foreground`}
          {...PULSE}
        >
          <RailIcon className="stroke-1.25 size-full" />
        </motion.span>
      )}

      {/* While loading, the glyph lights up each time the segment comes back to
          the top — so it reads as the head of the loader being struck rather
          than as a separate thing blinking nearby.

          Kept in step by sharing the period, not by watching the segment:
          both start on the same commit and both are driven by elapsed time, so
          they can't drift. The segment ping-pongs, which means it's at the top
          once every two sweeps — hence the doubling. */}
      {running && !reduced && (
        <motion.span
          aria-hidden
          className={`${RAIL_ICON_BOX} text-foreground`}
          // Up and back down over `ICON_FLASH_S`, then nothing until the segment
          // comes round again.
          //
          // Crucially the flash is *centred* on the arrival, not started by it:
          // it swells as the segment closes the last stretch and is spent by the
          // time it's heading away again. Starting it on arrival instead leaves
          // the glyph lit while the segment visibly leaves, which reads as a
          // decay trailing the loader rather than the loader striking the mark.
          //
          // The wait is `repeatDelay` rather than dead keyframes stretched over
          // a long `duration` with a `times` array — that shape animates across
          // the whole cycle and can only ever be a snap followed by a slow fade.
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            duration: ICON_FLASH_S,
            ease: "easeInOut",
            repeat: Infinity,
            delay: LOADER_SWEEP_S - ICON_FLASH_S / 5,
            repeatDelay: Math.max(0, LOADER_CYCLE_S - ICON_FLASH_S),
          }}
        >
          <RailIcon className="stroke-1.25 size-full" />
        </motion.span>
      )}

      <div
        data-slot="rail"
        data-running={running || undefined}
        className={`absolute top-6 -left-7.5 w-px overflow-hidden bg-border ${
          stopsAtReplay ? "bottom-1" : "bottom-0"
        }`}
      >
        {running && (
          <motion.div
            className="h-1/3 w-full bg-foreground/70"
            // Starts at the far end and rises *to* the glyph, so the first
            // strike lands one sweep in rather than making you wait a whole
            // cycle for it. Arrivals then fall on every `LOADER_CYCLE_S`, which
            // is what the flash below is timed against.
            animate={{ y: ["200%", "0%"] }}
            /**
             * The one animation here that isn't expo out. A ping-pong wants to
             * ease at both ends; expo out would slam into every turn.
             */
            transition={{
              duration: LOADER_SWEEP_S,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        )}
        {pulseKey !== null && <Pulse key={pulseKey} />}
      </div>
    </>
  )
}

/**
 * A single flash of full-contrast colour over whatever it's laid on.
 *
 * The message's full stop: when it finishes, the rail and the hairline reaching
 * the replay control both light up once and settle back. Mounted fresh per run
 * so a replay fires it again, and drawn as an overlay rather than by animating
 * the colour itself — `bg-foreground` is already the right value in both
 * themes, where a hardcoded white or black would only work in one.
 */
function Pulse() {
  const reduced = useReducedMotion()
  if (reduced) return null

  return (
    <motion.span
      aria-hidden
      className="absolute inset-0 bg-foreground"
      {...PULSE}
    />
  )
}

/**
 * **Animation 1, reused.** A landing beat grows from zero height, pushing the
 * thread up — the same motion a new message makes, because to the person watching
 * it *is* a new message arriving.
 *
 * The beat's `enter` rides on top of that, with its own duration: making room and
 * appearing are two different things and want different timing.
 *
 * A beat landing **over the poster** is the exception, and only fades. It's
 * replacing something of exactly its own height, so animating height there would
 * collapse the message and re-expand it for no reason — a flinch at the very
 * moment the performance is meant to begin.
 */
function BeatView({
  beat,
  overPoster,
  animates,
}: {
  beat: Beat
  overPoster: boolean
  animates: boolean
}) {
  const enter = BEAT_ENTERS[beat.enter]
  const sizes = !overPoster

  return (
    <motion.div
      data-slot="beat"
      initial={
        animates ? { ...(sizes ? { height: 0 } : {}), ...enter.initial } : false
      }
      animate={{ ...(sizes ? { height: "auto" } : {}), ...enter.animate }}
      /**
       * The first beat cuts out with no animation at all — animating the line
       * you're looking at straight out of existence reads as a glitch, where a
       * hard cut reads as a deliberate stop. Everything after it collapses over
       * `BEAT_REWIND_MS`, pinned to that constant so the wind-back and the
       * animation can't drift apart.
       */
      exit={
        sizes
          ? {
              height: 0,
              ...enter.initial,
              transition: {
                duration: BEAT_REWIND_MS / 1_000,
                ease: CHAT_EASE,
              },
            }
          : { opacity: 0, transition: { duration: 0 } }
      }
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
      <Play className="size-2 fill-current" />
      <span className="text-[10px]">Playable message</span>
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
  const reduced = useReducedMotion()

  return (
    // `h-4` matches the glyph below, so the row is exactly the height of the
    // mark sitting in its gutter and the rail's stopping point stays predictable.
    <div className="relative mt-1.5 flex h-4 items-center">
      {/* The same glyph that heads the rail, repeated at the foot of it — so a
          rested message is bracketed by the mark rather than trailing off. It
          pulses on the same beat as the rail's, since they're two ends of one
          punctuation, and the whole control unmounts the moment you play again.

          Stacked bright-over-muted for the same reason as the rail's: the flash
          has to be theme-correct without naming a colour, and an opacity
          overlay can't be painted across an outlined glyph. */}
      <span aria-hidden className={`${REPLAY_ICON_BOX} text-foreground/10`}>
        <RailIcon className="stroke-1.25 size-full -scale-x-100" />
      </span>
      {!reduced && (
        <motion.span
          aria-hidden
          className={`${REPLAY_ICON_BOX} text-foreground`}
          {...PULSE}
        >
          <RailIcon className="stroke-1.25 size-full -scale-x-100" />
        </motion.span>
      )}

      <button
        type="button"
        onClick={onReplay}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <RotateCcw className="size-2.5" />
        Replay
      </button>
    </div>
  )
}
