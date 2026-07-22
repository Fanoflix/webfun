import { createFileRoute } from "@tanstack/react-router"
import { ConceptChatDemo } from "@/features/speculative-ui/concept-chat/demo/ConceptChatDemo"

export const Route = createFileRoute("/concept-chat")({
  component: ConceptChatDemo,
})
