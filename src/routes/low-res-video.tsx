import { createFileRoute } from "@tanstack/react-router"
import { LowResVideo } from "@/features/canvas-stuff/low-res-video"

export const Route = createFileRoute("/low-res-video")({
  component: LowResVideo,
})
