import { memo, useImperativeHandle, useMemo, useRef } from "react"
import type { CSSProperties, Ref } from "react"

export type DotShape = "circle" | "square" | "diamond"

export type PixelScreenHandle = {
  /** Push a fresh RGBA buffer (length `width*height*4`) onto the dots. */
  paint: (data: Uint8ClampedArray) => void
}

const OFF_COLOR = "rgb(20 20 20)"

function shapeStyle(shape: DotShape): CSSProperties {
  if (shape === "square") return { borderRadius: 0 }
  if (shape === "diamond") {
    return {
      borderRadius: 0,
      clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
    }
  }
  return { borderRadius: 9999 }
}

type Props = {
  width: number
  height: number
  gap: number
  dotSize: number
  shape: DotShape
  ref?: Ref<PixelScreenHandle>
}

/**
 * The virtual screen: a `width`×`height` grid of dots, one per pixel.
 *
 * Painting mutates each dot's `backgroundColor` directly (via stored refs) so a
 * 60fps video never triggers a re-render. The dot colour is seeded in the ref
 * callback rather than as an inline style, so re-rendering the grid (e.g. on a
 * shape change) never clobbers the last painted frame. Memoised so unrelated
 * parent state (play/mute toggles) doesn't re-render thousands of nodes.
 */
export const PixelScreen = memo(function PixelScreen({
  width,
  height,
  gap,
  dotSize,
  shape,
  ref,
}: Props) {
  const dotsRef = useRef<(HTMLDivElement | null)[]>([])
  const count = width * height

  useImperativeHandle(
    ref,
    () => ({
      paint(data) {
        const dots = dotsRef.current
        for (let i = 0; i < count; i++) {
          const dot = dots[i]
          if (!dot) continue
          const o = i * 4
          dot.style.backgroundColor = `rgb(${data[o]} ${data[o + 1]} ${data[o + 2]})`
        }
      },
    }),
    [count]
  )

  const cells = useMemo(() => Array.from({ length: count }), [count])
  const dotShape = shapeStyle(shape)

  return (
    <section
      className="flex flex-wrap content-start"
      style={{ width: width * dotSize + (width - 1) * gap, gap }}
    >
      {cells.map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            dotsRef.current[i] = el
            if (el && !el.style.backgroundColor) {
              el.style.backgroundColor = OFF_COLOR
            }
          }}
          style={{ width: dotSize, height: dotSize, ...dotShape }}
        />
      ))}
    </section>
  )
})
