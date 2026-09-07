import { createFileRoute } from "@tanstack/react-router"
import { ConceptChatDemo } from "@/features/speculative-ui/concept-chat/demo/ConceptChatDemo"
import { pageMeta } from "@/features/seo/meta"

export const Route = createFileRoute("/concept-chat")({
  head: () => ({
    meta: pageMeta({
      title: "Concept chat",
      description:
        "A message that knows how it's meant to be read. Press play and it performs itself, line by line, at the pace the sender chose.",
      path: "/concept-chat",
    }),
  }),
  component: ConceptChatDemo,
})
