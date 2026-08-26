import type { ReactNode } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { MONO, PANEL, PANEL_HEADER } from "../styles"
import { HintText } from "../HintText"
import type { Mode } from "./useTanstackShowcase"

const MODES: { id: Mode; label: string; hint: string }[] = [
  {
    id: "network",
    label: "Network",
    hint: "Every request the app made, laid out like a browser's network tab — what each click cost, and what it skipped entirely.",
  },
  {
    id: "architecture",
    label: "Architecture",
    hint: "The same system drawn as a path: what you touch on the left, the server on the right, and whatever each rung puts in between.",
  },
]

/**
 * The panel to the right of the app, and the switch that chooses what it shows.
 *
 * The switch lives *in* the panel's own header rather than up in the setup bar,
 * because it isn't setup — it doesn't change what the app does, only what you're
 * watching it through. Sitting here it reads like the tab strip of a devtools
 * pane, which is exactly what it is.
 */
export function InstrumentPanel({
  mode,
  onMode,
  meta,
  actions,
  children,
}: {
  mode: Mode
  onMode: (mode: Mode) => void
  /** A short readout on the right of the header, e.g. the request count. */
  meta?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <aside
      className={cn(
        PANEL,
        "showcase-devtools h-[22rem] w-full border-t border-border lg:h-auto lg:w-[26rem] lg:shrink-0 lg:border-t-0 lg:border-l"
      )}
    >
      <header className={cn(PANEL_HEADER, "gap-2 pl-1")}>
        <div className="flex min-w-0 items-center">
          {MODES.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-pressed={item.id === mode}
                    onClick={() => onMode(item.id)}
                    className={cn(
                      "rounded px-2 py-1 text-[10px] font-medium tracking-wider uppercase transition-colors",
                      item.id === mode
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  />
                }
              >
                {item.label}
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-xs leading-relaxed"
              >
                <HintText text={item.hint} />
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {meta && (
            <span className={cn(MONO, "text-muted-foreground")}>{meta}</span>
          )}
          {actions}
        </div>
      </header>

      {children}
    </aside>
  )
}
