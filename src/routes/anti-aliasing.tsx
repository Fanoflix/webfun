import { createFileRoute } from "@tanstack/react-router"
import { AntiAlias } from "@/features/canvas-stuff/anti-aliasing/AntiAlias"

export const Route = createFileRoute("/anti-aliasing")({
  component: AntiAlias,
})
