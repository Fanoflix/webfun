import { createFileRoute } from "@tanstack/react-router"
import { FutureTableDemo } from "@/features/speculative-ui/future-table/demo/FutureTableDemo"

export const Route = createFileRoute("/future-table")({
  component: FutureTableDemo,
})
