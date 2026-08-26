import { IntroLink, ToolIntro } from "@/components/layout/ToolIntro"
import { cn } from "@/lib/utils"
import { RungHost } from "../rungs/RungHost"
import { AppMode } from "../app/AppMode"
import { ArchitectureMode } from "../architecture/ArchitectureMode"
import { ClearLogButton, TimelinePanel } from "../timeline/TimelinePanel"
import { InstrumentPanel } from "./InstrumentPanel"
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
    deselect,
    timeline,
    architecture,
    clearLog,
    railOffset,
    latestEvent,
    attachFlows,
  } = useTanstackShowcase()

  return (
    <div
      className={cn(
        // Pinned to the viewport rather than growing with its contents: the
        // shell minus the shared layout's header (h-12) and padding (p-6, top
        // and bottom). That's what stops the *page* scrolling — each pane
        // handles its own overflow instead.
        //
        // `min-h-100` is the floor. Below that the page scrolls again, which is
        // the right fallback: three panes crushed into 200px would be unusable.
        "mx-auto flex w-full max-w-[2240px] flex-col gap-3 self-stretch transition-[padding] duration-200 lg:h-[calc(100svh-5rem)] lg:min-h-100",
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
        serverConfig={serverConfig}
        onServerConfig={updateServerConfig}
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
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
                  onBack={deselect}
                  latestEvent={latestEvent}
                />
              )}
            </RungHost>

            {/* The app stays put; only the instrument beside it changes — and
                the switch between instruments lives in that panel's own header,
                because it isn't setup, it's what you're watching through. */}
            <InstrumentPanel
              mode={mode}
              onMode={setMode}
              meta={`${timeline.requestCount} ${
                timeline.requestCount === 1 ? "request" : "requests"
              }`}
              actions={
                mode === "network" ? (
                  <ClearLogButton
                    onClear={clearLog}
                    disabled={timeline.isEmpty}
                  />
                ) : null
              }
            >
              {mode === "architecture" ? (
                <ArchitectureMode
                  architecture={architecture}
                  latencyMs={serverConfig.latencyMs}
                />
              ) : (
                <TimelinePanel timeline={timeline} />
              )}
            </InstrumentPanel>
          </div>
        </SwitchBlur>

        <RungSwitch toName={switchingTo} />
      </div>
    </div>
  )
}
