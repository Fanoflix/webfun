import { useRef, useState } from "react"
import type { DragEvent, ReactNode } from "react"

import { cn } from "@/lib/utils"

type Props = {
  /** An `accept` value with a wildcard subtype, e.g. `image/*`. */
  accept: `${string}/*`
  onPick: (file: File) => void
  /**
   * Whether nothing is loaded yet. Clicking only opens the picker while empty:
   * once there's a source, the surface belongs to the tool (dithering uses a
   * press on the canvas to compare), and a stray click that reopened a file
   * dialog would be worse than no shortcut at all. Dropping still works either
   * way, which is the gesture people reach for to *replace* something.
   */
  empty: boolean
  /** Empty-state line, e.g. "Drop an image, or click to upload". */
  hint: string
  className?: string
  children: ReactNode
}

/**
 * The preview surface, doubling as the upload target.
 *
 * The empty state used to be a `pointer-events-none` label that said "click
 * upload" while pointing at a button somewhere else on the screen — it read as
 * an affordance and behaved like a caption. Here the whole area is a real
 * `<button>`, so it takes a click, a tab stop and Enter/Space for free.
 */
export function FileDropZone({
  accept,
  onPick,
  empty,
  hint,
  className,
  children,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  // "image/*" → "image/". Anything else dropped here is ignored rather than
  // handed to a decoder that will fail on it.
  const prefix = `${accept.slice(0, accept.indexOf("/"))}/`

  const takeFile = (file: File | null | undefined) => {
    if (file?.type.startsWith(prefix)) onPick(file)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    takeFile(e.dataTransfer.files.item(0))
  }

  return (
    <div
      className={cn("relative", className)}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => setDragging(true)}
      onDragLeave={(e) => {
        // Fires for children too; ignore anything still inside the zone.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDragging(false)
        }
      }}
      onDrop={onDrop}
    >
      {children}

      {empty && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={hint}
          className="group absolute inset-0 grid cursor-pointer place-items-center outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <span
            className={cn(
              "border border-dashed px-6 py-4 text-xs tracking-widest uppercase transition-colors",
              dragging
                ? "border-white/60 text-white"
                : "border-white/25 text-white/50 group-hover:border-white/40"
            )}
          >
            {hint}
          </span>
        </button>
      )}

      {/* Ring the whole surface while a file is over it, loaded or not — the
          only feedback that a drop will actually land. */}
      {dragging && !empty && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 border-2 border-white/60"
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          takeFile(e.target.files?.[0])
          // Let the same file be chosen twice in a row.
          e.target.value = ""
        }}
      />
    </div>
  )
}
