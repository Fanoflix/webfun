import { ToolIntro } from "@/components/layout/ToolIntro"
import { FloatingPanels } from "@/components/floating-panels/FloatingPanels"
import { ZoomBox } from "@/components/loupe/ZoomBox"
import { ZoomSelection } from "@/components/loupe/ZoomSelection"
import { AACanvas } from "./AACanvas"
import { Controls } from "./Controls"
import { useAntiAlias } from "./useAntiAlias"

export function AntiAlias() {
  const {
    settings,
    comparing,
    collapsed,
    animating,
    region,
    zoomLevel,
    canvasRef,
    loupeRef,
    displayWidth,
    displayHeight,
    onChange,
    exportPng,
    setComparing,
    setCollapsed,
    setAnimating,
    setRegion,
    setZoomLevel,
  } = useAntiAlias()

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <ToolIntro title="Anti-aliasing" className="w-full max-w-3xl">
        Every game you've played fights this: screens are made of squares, and
        nothing in a game is. The fix is almost too dumb — look at each pixel a
        few extra times and average what you saw. Drag Samples up and watch the
        staircase melt.
      </ToolIntro>

      <div className="relative grid place-items-center bg-black p-4">
        <AACanvas
          ref={canvasRef}
          comparing={comparing}
          displayWidth={displayWidth}
          displayHeight={displayHeight}
          onHoldStart={() => setComparing(true)}
          onHoldEnd={() => setComparing(false)}
        >
          <ZoomSelection
            region={region}
            width={displayWidth}
            height={displayHeight}
            onChange={setRegion}
          />
        </AACanvas>
      </div>

      <FloatingPanels
        collapsed={collapsed}
        onExpand={() => setCollapsed(false)}
      >
        <Controls
          settings={settings}
          onChange={onChange}
          animating={animating}
          onToggleAnimate={setAnimating}
          onExport={exportPng}
          onCompareStart={() => setComparing(true)}
          onCompareEnd={() => setComparing(false)}
          onCollapse={() => setCollapsed(true)}
        />
        <ZoomBox
          loupeRef={loupeRef}
          zoomLevel={zoomLevel}
          onZoomLevelChange={setZoomLevel}
        />
      </FloatingPanels>
    </div>
  )
}
