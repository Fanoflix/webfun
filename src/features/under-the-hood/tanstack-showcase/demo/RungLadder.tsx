import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Fragment } from "react"
import { cn } from "@/lib/utils"
import type { RungId } from "../engine/rungs"
import { RUNGS } from "../engine/rungs"
import { HintText } from "../HintText"

/**
 * The ladder, as one bar that fills.
 *
 * Three separate chips said "pick one of these", which is the wrong idea: rung 2
 * doesn't *replace* rung 1, it stands on it — the collection is fed by the very
 * Query the rung below set up. An earlier version chevroned the chips together
 * and still read as a selection, because two filled greys beside a white one
 * look like one thing chosen rather than three things stacked.
 *
 * So the segments share a single unbroken fill and no seams: what's running is
 * the *whole* filled length, not the last box. The current rung is the leading
 * edge of it, marked by being the only label at full strength — the ones behind
 * it are still lit, just no longer the thing you're looking at.
 *
 * A "+" sits at each joint inside the fill, so the run reads as an addition —
 * basic + query + db — rather than as a row that happens to be shaded.
 */
export function RungLadder({
  rung,
  onRung,
}: {
  rung: RungId
  onRung: (rung: RungId) => void
}) {
  return (
    <div className="flex h-7 shrink-0 overflow-hidden rounded border border-border">
      {RUNGS.map((step, index) => {
        const reached = index <= rung
        const current = index === rung

        return (
          <Fragment key={step.id}>
            {index > 0 && (
              // The slot exists at every joint so the segments never shift when
              // you step up; only the joints inside the fill actually show a
              // "+", since one hanging off the end, against the unfilled track,
              // would read as an invitation rather than a joint.
              <span
                aria-hidden
                className={cn(
                  "text-md flex items-center pb-0.75 font-medium select-none",
                  reached
                    ? "bg-foreground text-background/70"
                    : "text-transparent"
                )}
              >
                +
              </span>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-pressed={current}
                    aria-disabled={!step.available}
                    onClick={() => {
                      if (!step.available) return
                      onRung(step.id)
                    }}
                    className={cn(
                      "grid px-3 text-[11px] tracking-wider uppercase transition-colors",
                      // No dividers between filled segments on purpose — a seam
                      // would break the run back into separate chips, which is
                      // exactly the reading this is trying to avoid.
                      reached
                        ? "bg-foreground"
                        : "text-muted-foreground hover:bg-muted/60",
                      current
                        ? "text-background"
                        : reached && "text-background/60",
                      !step.available && "opacity-50"
                    )}
                  />
                }
              >
                {/* Two copies stacked in one grid cell: the hidden one is
                    always at the heaviest weight, so the segment is already as
                    wide as it will ever need to be and nothing shifts when this
                    rung becomes the current one. */}
                <span className="invisible col-start-1 row-start-1 font-black">
                  {step.name}
                </span>
                <span
                  className={cn(
                    "col-start-1 row-start-1 self-center",
                    current ? "font-black" : "font-medium"
                  )}
                >
                  {step.name}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs leading-relaxed">
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
          </Fragment>
        )
      })}
    </div>
  )
}
