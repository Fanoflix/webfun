import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ServerConfig } from "../engine/server"
import type { RungId } from "../engine/rungs"
import { RUNGS } from "../engine/rungs"
import type { Mode } from "./useTanstackShowcase"

const MODES: { id: Mode; label: string; available: boolean }[] = [
  { id: "app", label: "App", available: true },
  { id: "architecture", label: "Architecture", available: false },
  { id: "code", label: "Code", available: false },
]

/** The ladder stepper, the mode toggle and the network dials. View only. */
export function Controls({
  rung,
  onRung,
  mode,
  onMode,
  serverConfig,
  onServerConfig,
}: {
  rung: RungId
  onRung: (rung: RungId) => void
  mode: Mode
  onMode: (mode: Mode) => void
  serverConfig: ServerConfig
  onServerConfig: (patch: Partial<ServerConfig>) => void
}) {
  const active = RUNGS[rung]

  return (
    <div className="space-y-3 border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* The ladder. */}
        <div className="flex items-center gap-1">
          {RUNGS.map((step) => (
            <Button
              key={step.id}
              size="sm"
              variant={step.id === rung ? "default" : "outline"}
              disabled={!step.available}
              title={step.available ? step.stack : "Coming in a later phase"}
              onClick={() => onRung(step.id)}
            >
              {step.name}
            </Button>
          ))}
        </div>

        {/* The mode toggle. */}
        <div className="flex items-center gap-1">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={!item.available}
              onClick={() => onMode(item.id)}
              className={cn(
                "border px-2 py-1 text-xs transition-colors",
                item.id === mode
                  ? "border-foreground text-foreground"
                  : "border-border text-muted-foreground",
                item.available ? "hover:text-foreground" : "opacity-40"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="font-mono">{active.stack}</span> — {active.gain}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Latency
          <input
            type="range"
            min={0}
            max={2000}
            step={100}
            value={serverConfig.latencyMs}
            onChange={(e) =>
              onServerConfig({ latencyMs: Number(e.target.value) })
            }
            className="w-32"
          />
          <span className="w-12 font-mono tabular-nums">
            {serverConfig.latencyMs}ms
          </span>
        </label>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={serverConfig.failWrites}
            onChange={(e) => onServerConfig({ failWrites: e.target.checked })}
          />
          Writes fail
        </label>
      </div>
    </div>
  )
}
