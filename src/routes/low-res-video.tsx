import { createFileRoute } from "@tanstack/react-router"
import { LowResVideo } from "@/features/canvas-stuff/low-res-video/LowResVideo"

export const Route = createFileRoute("/low-res-video")({
  component: LowResVideo,
})
