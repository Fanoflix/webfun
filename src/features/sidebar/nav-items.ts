import type { LucideIcon } from "lucide-react"
import {
  Grip,
  MessagesSquare,
  MonitorPlay,
  Spline,
  Sparkles,
  Layers,
  Table2,
  Type,
} from "lucide-react"

/**
 * A single sidebar entry. `keywords` are hidden search aliases — terms a person
 * might type that don't appear in the title (jargon, synonyms, related tech) —
 * so the search feels like it "knows" the tool. They never render.
 */
export type NavItem = {
  title: string
  to: string
  icon: LucideIcon
  /**
   * One-line teaser, shown on the home page card. A condensed take on the tool's
   * own intro — kept here as plain text because the page intros are rich nodes
   * (CharacterFlow's links out) and are too long for a card.
   */
  blurb: string
  keywords?: string[]
}

/** A collapsible section: a category label and the tools under it. */
export type NavGroup = {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: "Before / After",
    items: [
      {
        title: "Dithering",
        to: "/dithering",
        blurb:
          "Old consoles had almost no colours, so they cheated — scatter dots, let your eyes blend the rest.",
        icon: Grip,
        keywords: [
          "bayer",
          "floyd steinberg",
          "error diffusion",
          "quantize",
          "posterize",
          "halftone",
          "grain",
          "1-bit",
          "ordered",
        ],
      },
      {
        title: "Anti-aliasing",
        to: "/anti-aliasing",
        blurb:
          "Screens are made of squares. Nothing in a game is. Look at each pixel a few extra times and average.",
        icon: Spline,
        keywords: [
          "aa",
          "ssaa",
          "msaa",
          "supersampling",
          "jaggies",
          "staircase",
          "smooth edges",
          "coverage",
          "rasterization",
        ],
      },
    ],
  },
  {
    label: "Recreations",
    items: [
      {
        title: "Low Res Video",
        to: "/low-res-video",
        blurb:
          "Throw away almost every pixel and your brain still fills it back in. A stadium scoreboard, basically.",
        icon: MonitorPlay,
        keywords: [
          "pixel",
          "pixelate",
          "led wall",
          "dot screen",
          "scoreboard",
          "mosaic",
          "downscale",
          "retro",
        ],
      },
    ],
  },
  {
    label: "Motion",
    items: [
      {
        title: "Character Flow",
        to: "/character-flow",
        blurb:
          "NumberFlow's odometer roll, but for any word — surviving letters slide, the rest roll away.",
        icon: Type,
        keywords: [
          "numberflow",
          "number flow",
          "odometer",
          "split flap",
          "flip",
          "morph",
          "text transition",
          "animated text",
          "roll",
          "ticker",
        ],
      },
      {
        title: "Style Flow",
        to: "/style-flow",
        blurb:
          "Variable fonts let every letter pick its own weight, slant and serif, live in the browser.",
        icon: Sparkles,
        keywords: [
          "variable font",
          "font weight",
          "italic",
          "serif",
          "typography",
          "shimmer",
          "font variation settings",
          "wght",
          "slnt",
          "recursive",
          "fraunces",
          "animated type",
        ],
      },
    ],
  },
  {
    label: "Speculative UI",
    items: [
      {
        title: "Concept table 1",
        to: "/future-table",
        blurb:
          "Rows never move. The slots stay put and their contents flip over in place, like a departure board.",
        icon: Table2,
        keywords: [
          "fixed rows",
          "departure board",
          "split flap",
          "slots",
          "pagination",
          "placeholder",
          "future ui",
        ],
      },
      {
        title: "Concept chat",
        to: "/concept-chat",
        blurb:
          "A message that knows how it's meant to be read — press play and it performs itself.",
        icon: MessagesSquare,
        keywords: [
          "chat",
          "messaging",
          "slack",
          "discord",
          "whatsapp",
          "timeline",
          "timed message",
          "playback",
          "future ui",
        ],
      },
    ],
  },
  {
    label: "Under the hood",
    items: [
      {
        title: "TanStack, lid off",
        to: "/tanstack-showcase",
        blurb:
          "The same app built three ways. Step up the ladder and watch the requests, spinners and bookkeeping disappear.",
        icon: Layers,
        keywords: [
          "tanstack",
          "react query",
          "tanstack db",
          "cache",
          "stale time",
          "invalidation",
          "optimistic update",
          "rollback",
          "data fetching",
          "state management",
        ],
      },
    ],
  },
]
