import { IntroLink, ToolIntro } from "@/components/layout/ToolIntro"
import { cn } from "@/lib/utils"
import { RungHost } from "../rungs/RungHost"
import { AppMode } from "../app/AppMode"
import { TimelinePanel } from "../timeline/TimelinePanel"
import { SHELL } from "../styles"
import { Controls } from "./Controls"
import { RungSwitch, SwitchBlur } from "./RungSwitch"
import { useTanstackShowcase } from "./useTanstackShowcase"

/**
 * The showcase page. View only — everything stateful lives in
 * `useTanstackShowcase`, and the ticket data belongs to whichever rung
 * `RungHost` has mounted.
 *
 * Laid out full-bleed rather than centred like the other tools: this one is an
 * app beside its devtools, and both want room. `self-stretch` opts out of the
 * shared layout's vertical centring so the panels can fill the viewport.
 */
export function TanstackShowcase() {
  const {
    bus,
    server,
    serverConfig,
    updateServerConfig,
    rung,
    setRung,
    displayRung,
    switchingTo,
    mode,
    setMode,
    selectedId,
    select,
    timeline,
    clearLog,
    railOffset,
    latestEvent,
    attachFlows,
  } = useTanstackShowcase()

  return (
    <div
      className={cn(
        "mx-auto flex h-full w-full max-w-[2240px] flex-col gap-4 self-stretch transition-[padding] duration-200",
        // The shared layout's own p-6 already covers part of the track.
        railOffset && "lg:pl-[calc(var(--sidebar-width)-1.5rem)]"
      )}
    >
      <ToolIntro title="TanStack, with the lid off" className="shrink-0">
        The same ticket app, built three ways. Step up the ladder and watch what
        stops happening — the requests, the spinners, the hand-written
        bookkeeping. Everything on the right is real:{" "}
        <IntroLink href="https://tanstack.com/query">TanStack Query</IntroLink>{" "}
        reporting its own cache, not a re-enactment.
      </ToolIntro>

      <Controls
        rung={displayRung}
        onRung={setRung}
        mode={mode}
        onMode={setMode}
        serverConfig={serverConfig}
        onServerConfig={updateServerConfig}
      />

      <div className="relative flex min-h-[34rem] flex-1 flex-col">
        <SwitchBlur active={switchingTo !== null}>
          <div className={cn(SHELL, "w-full")}>
            <RungHost
              rung={rung}
              server={server}
              bus={bus}
              selectedId={selectedId}
            >
              {(view) => (
                <AppMode
                  view={attachFlows(view)}
                  selectedId={selectedId}
                  onSelect={select}
                  latestEvent={latestEvent}
                />
              )}
            </RungHost>

            <TimelinePanel timeline={timeline} onClear={clearLog} />
          </div>
        </SwitchBlur>

        <RungSwitch toName={switchingTo} />
      </div>
    </div>
  )
}
