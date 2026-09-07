import { createFileRoute } from "@tanstack/react-router"
import { Dither } from "@/features/canvas-stuff/dithering/Dither"
import { pageMeta } from "@/features/seo/meta"

export const Route = createFileRoute("/dithering")({
  head: () => ({
    meta: pageMeta({
      title: "Dithering",
      description:
        "Old consoles had almost no colours, so they cheated: scatter dots of the ones you do have and let your eyes blend the rest. Drag the sliders and watch it happen.",
      path: "/dithering",
    }),
  }),
  component: Dither,
})
