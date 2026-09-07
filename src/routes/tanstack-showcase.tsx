import { createFileRoute } from "@tanstack/react-router"
import { TanstackShowcase } from "@/features/under-the-hood/tanstack-showcase/demo/TanstackShowcase"
import { pageMeta } from "@/features/seo/meta"

export const Route = createFileRoute("/tanstack-showcase")({
  head: () => ({
    meta: pageMeta({
      title: "TanStack, lid off",
      description:
        "The same ticket app built three ways, with the network tab wired open. Step up the ladder and watch the hand-written bookkeeping disappear.",
      path: "/tanstack-showcase",
    }),
  }),
  component: TanstackShowcase,
})
