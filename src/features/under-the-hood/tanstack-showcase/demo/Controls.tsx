import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { COLUMN_LABEL, MONO } from "../styles"
import type { ServerConfig } from "../engine/server"
import type { RungId } from "../engine/rungs"
import { RUNGS } from "../engine/rungs"
import { RungLadder } from "./RungLadder"

/** Thin vertical rule between control clusters. */
const DIVIDER = "hidden h-5 w-px bg-border lg:block"

/**
 * The rig around the app: which rung is running, and how the fake network
 * behaves. Not the mode switch — that moved into the panel it controls.
 *
 * Kept to a single short row on purpose. It's scaffolding, and it was taking up
 * more of the page than the thing it configures.
 */
export function Controls({
  rung,
  onRung,
  serverConfig,
  onServerConfig,
}: {
  rung: RungId
  onRung: (rung: RungId) => void
  serverConfig: ServerConfig
  onServerConfig: (patch: Partial<ServerConfig>) => void
}) {
  const active = RUNGS[rung]

  return (
    <TooltipProvider delay={0}>
      {/* Deliberately *not* panel-shaped. The app below is a bordered window;
          this is the rig around it, so it reads as a strip of switches — inset,
          dashed, and labelled — rather than another surface of the product. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 px-1 pb-2">
        <RungLadder rung={rung} onRung={onRung} />

        <span className={DIVIDER} />

        <label className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <span className={COLUMN_LABEL}>Latency</span>
          {/* Sized by a wrapper: the slider's own `data-horizontal:w-full`
            beats a width set on it directly, and a bare flex child collapses. */}
          <span className="block w-28 shrink-0">
            <Slider
              value={[serverConfig.latencyMs]}
              min={0}
              max={5000}
              step={50}
              onValueChange={(value) =>
                onServerConfig({
                  latencyMs: Array.isArray(value) ? value[0] : value,
                })
              }
              aria-label="Server latency"
            />
          </span>
          <span className={cn(MONO, "w-14 text-foreground")}>
            {serverConfig.latencyMs}ms
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={serverConfig.failWrites}
            onCheckedChange={(checked) =>
              onServerConfig({ failWrites: checked === true })
            }
          />
          Writes fail
        </label>

        <p
          className={cn(MONO, "ml-auto hidden text-muted-foreground xl:block")}
        >
          {active.stack}
        </p>
      </div>
    </TooltipProvider>
  )
}
