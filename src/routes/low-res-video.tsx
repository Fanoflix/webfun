import { createFileRoute } from "@tanstack/react-router"
import { LowResVideo } from "@/features/canvas-stuff/low-res-video/LowResVideo"
import { pageMeta } from "@/features/seo/meta"

export const Route = createFileRoute("/low-res-video")({
  head: () => ({
    meta: pageMeta({
      title: "Low Res Video",
      description:
        "Throw away almost every pixel and your brain fills the rest back in. Upload a video and watch it become a stadium scoreboard.",
      path: "/low-res-video",
    }),
  }),
  component: LowResVideo,
})
