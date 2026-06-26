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
    <div className="flex w-full justify-center">
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
