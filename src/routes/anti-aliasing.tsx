import { createFileRoute } from "@tanstack/react-router"
import { AntiAlias } from "@/features/canvas-stuff/anti-aliasing/AntiAlias"
import { pageMeta } from "@/features/seo/meta"

export const Route = createFileRoute("/anti-aliasing")({
  head: () => ({
    meta: pageMeta({
      title: "Anti-aliasing",
      description:
        "Screens are made of squares. Nothing in a game is. Look at each pixel a few extra times, average what you saw, and the staircase melts.",
      path: "/anti-aliasing",
    }),
  }),
  component: AntiAlias,
})
