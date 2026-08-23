import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { COLUMN_LABEL, MONO, TOGGLE_SELECTED } from "../styles"
import type { ServerConfig } from "../engine/server"
import type { RungId } from "../engine/rungs"
import { RUNGS } from "../engine/rungs"
import { HintText } from "../HintText"
import type { Mode } from "./useTanstackShowcase"

const MODES: {
  id: Mode
  label: string
  hint: string
  available: boolean
}[] = [
  {
    id: "app",
    label: "App",
    hint: "The product itself. Use it normally and watch what each click costs.",
    available: true,
  },
  {
    id: "architecture",
    label: "Architecture",
    hint: "A diagram of the moving parts, lighting up as data flows through them. Not built yet.",
    available: false,
  },
  {
    id: "code",
    label: "Code",
    hint: "The real source of whichever version is running, with the line that just ran highlighted. Not built yet.",
    available: false,
  },
]

/** Thin vertical rule between control clusters. */
const DIVIDER = "hidden h-5 w-px bg-border lg:block"

/** The ladder stepper, the network dials and the mode toggle. View only. */
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
    <TooltipProvider delay={0}>
      {/* Deliberately *not* panel-shaped. The app below is a bordered window;
          this is the rig around it, so it reads as a strip of switches — inset,
          dashed, and labelled — rather than another surface of the product. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2">
        <span className={cn(COLUMN_LABEL, "hidden shrink-0 sm:block")}>
          Setup
        </span>
        <ToggleGroup
          size="sm"
          variant="outline"
          spacing={0}
          value={[String(rung)]}
          onValueChange={(value) => {
            // Base UI hands back an array; an empty one means the active item was
            // clicked off. There is no "no rung", so that is simply ignored.
            if (value.length === 0) return
            const next = Number(value[0]) as RungId
            if (!RUNGS[next].available) return
            onRung(next)
          }}
        >
          {RUNGS.map((step) => (
            <Tooltip key={step.id}>
              {/* `render` merges the trigger onto the toggle rather than wrapping
                it — a button inside a button would be invalid markup. */}
              <TooltipTrigger
                render={
                  <ToggleGroupItem
                    value={String(step.id)}
                    // `aria-disabled`, not `disabled`: a disabled button
                    // swallows pointer events, and the rung that isn't built yet
                    // is the one whose tooltip people most need. The click is
                    // refused in the handler instead.
                    aria-disabled={!step.available}
                    className={cn(
                      "text-xs",
                      TOGGLE_SELECTED,
                      !step.available && "opacity-50"
                    )}
                  />
                }
              >
                {step.name}
              </TooltipTrigger>
              <TooltipContent className="max-w-xs leading-relaxed">
                {/* One wrapper: the popup lays its children out in a row, so
                    two siblings become two columns. */}
                <span className="block">
                  <HintText text={step.blurb} />
                  {!step.available && (
                    <span className="mt-1.5 block text-muted-foreground">
                      Not built yet — coming in a later phase.
                    </span>
                  )}
                </span>
              </TooltipContent>
            </Tooltip>
          ))}
        </ToggleGroup>

        <span className={DIVIDER} />

        <label className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <span className={COLUMN_LABEL}>Latency</span>
          {/* Sized by a wrapper: the slider's own `data-horizontal:w-full`
            beats a width set on it directly, and a bare flex child collapses. */}
          <span className="block w-28 shrink-0">
            <Slider
              value={[serverConfig.latencyMs]}
              min={0}
              max={2000}
              step={50}
              onValueChange={(value) =>
                onServerConfig({
                  latencyMs: Array.isArray(value) ? value[0] : value,
                })
              }
              aria-label="Server latency"
            />
          </span>
          <span className={cn(MONO, "w-12 text-foreground")}>
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

        <div className="ml-auto flex items-center gap-3">
          <p className={cn(MONO, "hidden text-muted-foreground xl:block")}>
            {active.stack}
          </p>
          <ToggleGroup
            size="sm"
            variant="outline"
            spacing={0}
            value={[mode]}
            onValueChange={(value) => {
              if (value.length === 0) return
              onMode(value[0] as Mode)
            }}
          >
            {MODES.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem
                      value={item.id}
                      aria-disabled={!item.available}
                      className={cn("text-xs", !item.available && "opacity-50")}
                    />
                  }
                >
                  {item.label}
                </TooltipTrigger>
                <TooltipContent className="max-w-xs leading-relaxed">
                  <HintText text={item.hint} />
                </TooltipContent>
              </Tooltip>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </TooltipProvider>
  )
}
