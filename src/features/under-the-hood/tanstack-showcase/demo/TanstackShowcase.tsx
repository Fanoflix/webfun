import { IntroLink, ToolIntro } from "@/components/layout/ToolIntro"
import { RungHost } from "../rungs/RungHost"
import { AppMode } from "../app/AppMode"
import { TimelinePanel } from "../timeline/TimelinePanel"
import { Controls } from "./Controls"
import { useTanstackShowcase } from "./useTanstackShowcase"

/**
 * The showcase page. View only — everything stateful lives in
 * `useTanstackShowcase`, and the ticket data belongs to whichever rung
 * `RungHost` has mounted.
 */
export function TanstackShowcase() {
  const {
    bus,
    server,
    serverConfig,
    updateServerConfig,
    rung,
    setRung,
    mode,
    setMode,
    selectedId,
    select,
    timeline,
    latestEvent,
    attachFlows,
  } = useTanstackShowcase()

  return (
    <div className="w-full max-w-5xl space-y-4">
      <ToolIntro title="TanStack, with the lid off">
        The same ticket app, built three ways. Step up the ladder and watch what
        stops happening — the requests, the spinners, the hand-written
        bookkeeping. Everything on the right is real:{" "}
        <IntroLink href="https://tanstack.com/query">TanStack Query</IntroLink>{" "}
        reporting its own cache, not a re-enactment.
      </ToolIntro>

      <Controls
        rung={rung}
        onRung={setRung}
        mode={mode}
        onMode={setMode}
        serverConfig={serverConfig}
        onServerConfig={updateServerConfig}
      />

      <div className="flex flex-col gap-4 md:h-[28rem] md:flex-row">
        <div className="min-h-0 min-w-0 flex-1 border border-border">
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
        </div>

        <TimelinePanel timeline={timeline} />
      </div>
    </div>
  )
}
