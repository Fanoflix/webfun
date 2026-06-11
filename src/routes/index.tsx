import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-lg font-medium">webfun</h1>
      <p className="text-sm text-muted-foreground">
        A home for small experiments. Pick one from the sidebar.
      </p>
    </div>
  )
}
