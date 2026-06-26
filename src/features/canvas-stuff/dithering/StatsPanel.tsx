import { Panel } from "@/components/floating-panels/FloatingPanels"
import type { DitherStats } from "./useDither"

export function StatsPanel({ stats }: { stats: DitherStats | null }) {
  return (
    <Panel title="Output">
      {stats ? (
        <dl className="flex flex-col gap-1.5 text-xs">
          <Row label="Source" value={`${stats.sourceW} × ${stats.sourceH}`} />
          <Row label="Output" value={`${stats.outW} × ${stats.outH}`} />
          <Row
            label="Colors"
            value={stats.uniqueColors.toLocaleString()}
            highlight
          />
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">No image loaded.</p>
      )}
    </Panel>
  )
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={`tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </dd>
    </div>
  )
}
