import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useComposer } from "./useComposer"

const ASSIGNEES = ["sam", "ada", "kit"]

/** New-ticket row at the top of the inbox. View only. */
export function Composer({
  onCreate,
  isMutating,
}: {
  onCreate: (title: string, assignee: string) => void
  isMutating: boolean
}) {
  const { title, setTitle, assignee, setAssignee, canSubmit, submit } =
    useComposer(onCreate)

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
      <Select
        value={assignee}
        onValueChange={(value) => setAssignee(value ?? assignee)}
      >
        <SelectTrigger size="sm" className="w-20 text-xs" aria-label="Assignee">
          <SelectValue>{assignee}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ASSIGNEES.map((name) => (
            <SelectItem key={name} value={name} className="text-xs">
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
