import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useComposer } from "./useComposer"

/** New-ticket row at the top of the inbox. View only. */
export function Composer({
  onCreate,
  isMutating,
}: {
  onCreate: (title: string, assignee: string) => void
  isMutating: boolean
}) {
  const { title, setTitle, canSubmit, submit } = useComposer(onCreate)

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Report an issue…"
        className="h-8 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
      />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        className="size-8"
        disabled={!canSubmit || isMutating}
        aria-label="Add ticket"
      >
        <Plus className="size-4" />
      </Button>
    </form>
  )
}
