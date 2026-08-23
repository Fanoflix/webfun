import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useComposer } from "./useComposer"

const ASSIGNEES = ["sam", "ada", "kit"]

/** New-ticket row. View only — state lives in `useComposer`. */
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
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New ticket…"
        className="h-8 flex-1 text-sm"
      />
      <select
        value={assignee}
        onChange={(e) => setAssignee(e.target.value)}
        className="h-8 border border-input bg-background px-2 font-mono text-xs"
      >
        {ASSIGNEES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={!canSubmit || isMutating}>
        Add
      </Button>
    </form>
  )
}
