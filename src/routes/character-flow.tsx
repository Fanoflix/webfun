import { createFileRoute } from "@tanstack/react-router"
import { CharacterFlowDemo } from "@/features/motion/character-flow/CharacterFlowDemo"

export const Route = createFileRoute("/character-flow")({
  component: CharacterFlowDemo,
})
