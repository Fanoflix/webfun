import { useCallback, useState } from "react"

/**
 * The new-ticket form's state. Plain controlled inputs for now — TanStack Form
 * arrives with the always-on tools in a later phase, and putting it in early
 * would blur the ladder's story while nothing is comparing against it.
 */
export function useComposer(
  onCreate: (title: string, assignee: string) => void
) {
  const [title, setTitle] = useState("")
  const [assignee, setAssignee] = useState("sam")

  const canSubmit = title.trim().length > 0

  const submit = useCallback(() => {
    if (!canSubmit) return
    onCreate(title.trim(), assignee)
    setTitle("")
  }, [canSubmit, onCreate, title, assignee])

  return { title, setTitle, assignee, setAssignee, canSubmit, submit }
}
