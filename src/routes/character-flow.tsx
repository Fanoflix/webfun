import { createFileRoute } from "@tanstack/react-router"
import { CharacterFlowDemo } from "@/features/motion/character-flow/CharacterFlowDemo"
import { pageMeta } from "@/features/seo/meta"

export const Route = createFileRoute("/character-flow")({
  head: () => ({
    meta: pageMeta({
      title: "Character Flow",
      description:
        "NumberFlow's odometer roll, but for any word. Letters both words share slide across; the rest roll away.",
      path: "/character-flow",
    }),
  }),
  component: CharacterFlowDemo,
})
