import { createFileRoute } from "@tanstack/react-router"
import { Dither } from "@/features/canvas-stuff/dithering/Dither"

export const Route = createFileRoute("/dithering")({
  component: Dither,
})
