import { motion } from "motion/react"

import { resolveEase } from "@/features/motion/eases"
import { cn } from "@/lib/utils"
import { MONO } from "../styles"
import { markerFor } from "./markers"
import type { Marker } from "./markers"
import type { Architecture, ArchNodeView, EdgeTraffic } from "./useArchitecture"

/**
 * The system, drawn — in the panel where the network log usually sits.
 *
 * It takes the *instrument's* place rather than the app's, so you keep driving
 * the real ticket app on the left and simply change what you're watching it
 * through. An earlier version replaced the app and had to grow its own row of
 * buttons to be usable at all, which made the interaction the weakest part of
 * the entry.
 *
 * Vertical because that's the shape of the slot: top is what you touch, bottom
 * is the only slow part, and whatever a rung puts between them is the space in
 * the middle. Rung 0 has none.
 */
/**
 * How long a packet takes to cross an edge that isn't the network — a hand-off
 * inside the browser. Short and fixed, because it genuinely is.
 */
const LOCAL_HOP_MS = 180

/** Even at zero latency a packet has to be visible for long enough to see. */
const MIN_HOP_MS = 120

/** A refusal comes back briskly — it's news, not a journey. */
const FAILURE_HOP_MS = 220

/** How long a marker that never moved stays beside the line before fading. */
const STILL_MARKER_MS = 700

/**
 * The fade a still marker uses — quick in, long hold, quick out. The hold is the
 * part anyone actually reads; an even crossfade would spend most of the time
 * half-visible.
 *
 * Shared by the icon and the line it lights up, so the two can't drift apart.
 */
const STILL_FADE = [0, 1, 1, 0]
const STILL_FADE_TIMING = {
  duration: STILL_MARKER_MS / 1000,
  ease: "linear" as const,
  times: [0, 0.12, 0.72, 1],
}

export function ArchitectureMode({
  architecture,
  latencyMs,
}: {
  architecture: Architecture
  /**
   * The server's configured latency — the whole round trip.
   *
   * A packet crossing the wire gets *half* of it, because the trip is two legs:
   * out at t=0, back when the response lands at t=latency. Giving each leg the
   * full latency had the outbound packet still travelling after the response had
   * already arrived, which read as the animation lagging the data.
   *
   * Tying it to the dial at all is what makes latency the tempo control here as
   * much as it is in the app.
   */
  latencyMs: number
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-0 overflow-auto p-4">
      {architecture.nodes.map((node, i) => (
        <div key={node.id} className="flex w-full flex-col items-center">
          {i > 0 && (
            <Edge
              traffic={architecture.edges[i - 1]}
              // Only the last edge is the wire. Everything above it is a
              // hand-off between things already in the browser.
              isNetwork={i === architecture.nodes.length - 1}
              latencyMs={latencyMs}
            />
          )}
          <Node node={node} />
        </div>
      ))}
    </div>
  )
}

function Node({ node }: { node: ArchNodeView }) {
  const Icon = node.icon

  return (
    <div
      className={cn(
        "relative w-full max-w-64 px-3 py-2",
        // The remote one is drawn as something you reach rather than something
        // you have: dashed, unfilled, set apart from the boxes that live in the
        // browser with it.
        node.remote
          ? "border border-dashed border-border bg-transparent"
          : "border border-border bg-card"
      )}
    >
      {/* A ring that plays once per arrival. Keyed on the event id, so a new
          event restarts it and an unrelated re-render does not. */}
      {node.pulseKey && (
        <motion.span
          key={node.pulseKey}
          initial={{ opacity: 0.6, scale: 0.96 }}
          animate={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: resolveEase("smooth") }}
          className="pointer-events-none absolute inset-0 border-2 border-foreground"
          aria-hidden
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon
            className={cn(
              "size-3.5 shrink-0",
              node.remote ? "text-muted-foreground" : "text-foreground/70"
            )}
            aria-hidden
          />
          {node.label}
        </p>
        <p className="text-[10px] text-muted-foreground">{node.role}</p>
      </div>
      <p
        className={cn(MONO, "mt-1 truncate text-[10px] text-muted-foreground")}
        title={node.last ?? undefined}
      >
        {node.last ?? "—"}
      </p>
    </div>
  )
}

/**
 * What is travelling, drawn as itself.
 *
 * A bare dot could only ever say "something moved". The icon says whether this
 * was a request, an answer, a free read or an undo, and the colour says whether
 * that was good news — which is the question the whole entry is asking.
 */
function Packet({
  traffic,
  marker,
  durationMs,
}: {
  traffic: NonNullable<EdgeTraffic>
  marker: Marker
  durationMs: number
}) {
  const Icon = marker.icon
  const start = traffic.direction === "out" ? "0%" : "100%"
  const end = traffic.direction === "out" ? "100%" : "0%"

  // Nothing crossed the gap, so nothing slides across it. It appears beside the
  // line, holds long enough to be read, and goes.
  if (!marker.travels) {
    return (
      <motion.span
        key={traffic.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: STILL_FADE }}
        transition={STILL_FADE_TIMING}
        className="absolute top-1/2 left-1/2 ml-2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-background"
        title={marker.meaning}
        aria-hidden
      >
        <Icon className="size-4" style={{ color: marker.color }} />
      </motion.span>
    )
  }

  return (
    <motion.span
      key={traffic.id}
      initial={{ top: start, opacity: 1 }}
      animate={{
        // Three keyframes for a round trip — down, then back to where it
        // started — spread evenly, so the halfway point is the server.
        top: traffic.roundTrip ? [start, end, start] : end,
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: durationMs / 1000,
        ease: "linear",
        // Hold full opacity almost the whole way, then go in the last moment.
        // Spread evenly (the keyframe default) the packet spends half its
        // journey half-faded, which reads as a slow request rather than a
        // clear one arriving.
        opacity: {
          duration: durationMs / 1000,
          ease: "linear",
          times: [0, 0.88, 1],
        },
      }}
      // A disc of the panel's own colour behind it, so the line doesn't show
      // through the icon while it travels.
      className="absolute left-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-background"
      title={marker.meaning}
      aria-hidden
    >
      <Icon className="size-4" style={{ color: marker.color }} />
    </motion.span>
  )
}

/**
 * The gap between two boxes, and whatever last crossed it.
 *
 * The dot animates down a plain vertical track rather than along an SVG path:
 * the layout is a single column, so "travel from one box to the next" is just 0%
 * to 100% of this element, with no path maths to keep in step with the layout.
 */
function Edge({
  traffic,
  isNetwork,
  latencyMs,
}: {
  traffic: EdgeTraffic
  isNetwork: boolean
  latencyMs: number
}) {
  const marker = traffic ? markerFor(traffic.kind) : null

  // A round trip gets the whole latency, because that is the whole latency: out
  // at t=0 and home at t=latency, landing with the data.
  const durationMs = !isNetwork
    ? LOCAL_HOP_MS
    : traffic?.roundTrip
      ? Math.max(latencyMs, MIN_HOP_MS * 2)
      : FAILURE_HOP_MS

  return (
    // A long run on purpose. The packet's *duration* follows the latency dial,
    // but the distance is what makes that duration legible — over a short gap
    // even a slow packet reads as a blink.
    //
    // The wire is dashed and labelled; the hops above it are solid. That one
    // difference is the whole argument — a rung earns its keep by not crossing
    // this line.
    <div
      className={cn(
        "relative h-24 shrink-0",
        isNetwork
          ? "w-0 border-l border-dashed border-border"
          : "w-px bg-border"
      )}
    >
      {isNetwork && (
        <span className="absolute top-1/2 right-full mr-2 -translate-y-1/2 text-[9px] tracking-wider text-muted-foreground uppercase">
          network
        </span>
      )}
      {/* The line lights up with the marker for exactly as long as it's there.
          Nothing crossed the gap, but the two blocks *did* talk — colouring the
          connection says that without implying a journey. */}
      {traffic && marker && !marker.travels && (
        <motion.span
          key={traffic.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: STILL_FADE }}
          transition={STILL_FADE_TIMING}
          style={{ backgroundColor: marker.color }}
          className="absolute inset-0"
          aria-hidden
        />
      )}
      {traffic && marker && (
        <Packet traffic={traffic} marker={marker} durationMs={durationMs} />
      )}
    </div>
  )
}
