import { formatDayLabel } from "../engine/time"

/**
 * The one divider in the module: a rule, a label, a rule. No badge, no pill, no
 * background — it marks a day boundary and gets out of the way.
 */
export function DateDivider({
  dayStart,
  now,
}: {
  dayStart: number
  now: number
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] tracking-wide text-muted-foreground">
        {formatDayLabel(dayStart, now)}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
