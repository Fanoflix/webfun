import { createFileRoute } from "@tanstack/react-router"
import { StyleFlowDemo } from "@/features/motion/style-flow/StyleFlowDemo"

export const Route = createFileRoute("/style-flow")({
  component: StyleFlowDemo,
})
