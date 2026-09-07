import { createFileRoute } from "@tanstack/react-router"
import { StyleFlowDemo } from "@/features/motion/style-flow/StyleFlowDemo"
import { pageMeta } from "@/features/seo/meta"

export const Route = createFileRoute("/style-flow")({
  head: () => ({
    meta: pageMeta({
      title: "Style Flow",
      description:
        "Every letter picking its own weight, slant and serif — live in the browser, one variable font, four independent axes.",
      path: "/style-flow",
    }),
  }),
  component: StyleFlowDemo,
})
