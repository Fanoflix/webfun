import { createFileRoute } from "@tanstack/react-router"
import { TanstackShowcase } from "@/features/under-the-hood/tanstack-showcase/demo/TanstackShowcase"

export const Route = createFileRoute("/tanstack-showcase")({
  component: TanstackShowcase,
})
