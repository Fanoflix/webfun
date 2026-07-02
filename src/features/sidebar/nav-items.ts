import type { LucideIcon } from "lucide-react"
import { Grip, MonitorPlay, Spline } from "lucide-react"

/**
 * A single sidebar entry. `keywords` are hidden search aliases — terms a person
 * might type that don't appear in the title (jargon, synonyms, related tech) —
 * so the search feels like it "knows" the tool. They never render.
 */
export type NavItem = {
  title: string
  to: string
  icon: LucideIcon
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
]
