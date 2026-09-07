import { ToolIntro } from "@/components/layout/ToolIntro"
import { FileDropZone } from "@/components/upload/FileDropZone"
import { FloatingPanels } from "@/components/floating-panels/FloatingPanels"
import { ZoomBox } from "@/components/loupe/ZoomBox"
import { ZoomSelection } from "@/components/loupe/ZoomSelection"
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
    compareLatched,
    collapsed,
    region,
    zoomLevel,
    canvasRef,
    loupeRef,
    displayWidth,
    displayHeight,
    onChange,
    pickFile,
    exportPng,
    setCompareLatched,
    startPeek,
    endPeek,
    setCollapsed,
    setRegion,
    setZoomLevel,
  } = useDither()

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <ToolIntro title="Dithering" className="w-full max-w-3xl">
        Old consoles had almost no colours, so they cheated: scatter dots of the
        colours you do have, and let someone's eyes blend the ones you don't.
        Hold the image — or leave Compare on — to see what it really looks like
        underneath.
      </ToolIntro>

      <FileDropZone
        accept="image/*"
        onPick={pickFile}
        empty={!source}
        hint="Drop an image, or click to upload"
        className="grid place-items-center bg-black p-4"
      >
        <DitherCanvas
          ref={canvasRef}
          originalUrl={source?.url ?? null}
          comparing={comparing}
          displayWidth={displayWidth}
          displayHeight={displayHeight}
          onHoldStart={startPeek}
          onHoldEnd={endPeek}
        >
          {source && (
            <ZoomSelection
              region={region}
              width={displayWidth}
              height={displayHeight}
              onChange={setRegion}
            />
          )}
        </DitherCanvas>
      </FileDropZone>

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
          comparing={compareLatched}
          onComparingChange={setCompareLatched}
          onCollapse={() => setCollapsed(true)}
        />
        <ZoomBox
          loupeRef={loupeRef}
          zoomLevel={zoomLevel}
          onZoomLevelChange={setZoomLevel}
          disabled={!source}
        />
        <StatsPanel stats={stats} />
      </FloatingPanels>
    </div>
  )
}
