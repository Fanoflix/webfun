import { FloatingPanels } from "@/components/floating-panels/FloatingPanels"
import { Controls } from "./Controls"
import { DitherCanvas } from "./DitherCanvas"
import { StatsPanel } from "./StatsPanel"
import { useDither } from "./useDither"

export function Dither() {
  const {
    settings,
    source,
    stats,
    comparing,
    collapsed,
    canvasRef,
    displayWidth,
    displayHeight,
    onChange,
    pickFile,
    exportPng,
    setComparing,
    setCollapsed,
  } = useDither()

  return (
    <div className="flex w-full justify-center">
      <div
        className="relative grid place-items-center bg-black p-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files.item(0)
          if (file && file.type.startsWith("image/")) pickFile(file)
        }}
      >
        <DitherCanvas
          ref={canvasRef}
          originalUrl={source?.url ?? null}
          comparing={comparing}
          displayWidth={displayWidth}
          displayHeight={displayHeight}
          onHoldStart={() => setComparing(true)}
          onHoldEnd={() => setComparing(false)}
        />
        {!source && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="text-xs tracking-widest text-white/50 uppercase">
              Drop an image or click upload
            </p>
          </div>
        )}
      </div>

      <FloatingPanels
        collapsed={collapsed}
        onExpand={() => setCollapsed(false)}
      >
        <Controls
          settings={settings}
          onChange={onChange}
          hasImage={!!source}
          onPickFile={pickFile}
          onExport={exportPng}
          onCompareStart={() => setComparing(true)}
          onCompareEnd={() => setComparing(false)}
          onCollapse={() => setCollapsed(true)}
        />
        <StatsPanel stats={stats} />
      </FloatingPanels>
    </div>
  )
}
