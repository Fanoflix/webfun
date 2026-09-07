import { createFileRoute } from "@tanstack/react-router"
import { FutureTableDemo } from "@/features/speculative-ui/future-table/demo/FutureTableDemo"
import { pageMeta } from "@/features/seo/meta"

export const Route = createFileRoute("/future-table")({
  head: () => ({
    meta: pageMeta({
      title: "Concept table 1",
      description:
        "What if table rows never moved? The slots stay put and their contents flip over in place, like a departure board.",
      path: "/future-table",
    }),
  }),
  component: FutureTableDemo,
})
