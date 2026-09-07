import { describe, expect, it } from "vitest"

import { SCENES, findEdge, render } from "./raster"

const W = 60
const H = 40
const BASE = {
  scene: "pentagon" as const,
  samples: 4,
  angle: 18,
  size: 0.6,
  resolution: 200,
}

describe("findEdge", () => {
  it("finds an edge for every scene, so the loupe is never parked on flat colour", () => {
    for (const { value } of SCENES) {
      const data = render(W, H, { ...BASE, scene: value })
      const edge = findEdge(data, W, H)
      expect(edge, `scene ${value}`).not.toBeNull()

      const px = Math.floor(edge!.x * W)
      const py = Math.floor(edge!.y * H)
      const r = data[(py * W + px) * 4]
      // Neither pure background nor pure foreground: a partially covered pixel.
      expect(r, `scene ${value}`).toBeGreaterThan(18)
      expect(r, `scene ${value}`).toBeLessThan(236)
    }
  })

  it("returns null when nothing is partially covered", () => {
    // One sample per pixel is a yes/no answer, so no pixel is ever partial.
    const aliased = render(W, H, { ...BASE, samples: 1 })
    expect(findEdge(aliased, W, H)).toBeNull()
  })

  it("prefers the edge nearest the middle of the frame", () => {
    const data = render(W, H, BASE)
    const edge = findEdge(data, W, H)!

    // Every other partial pixel must be at least as far from the centre.
    const cx = W / 2
    const cy = H / 2
    const dist = (x: number, y: number) => (x - cx) ** 2 + (y - cy) ** 2
    const chosen = dist(edge.x * W, edge.y * H)

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const r = data[(py * W + px) * 4]
        if (r <= 18 || r >= 236) continue
        expect(dist(px + 0.5, py + 0.5)).toBeGreaterThanOrEqual(chosen - 1e-9)
      }
    }
  })
})
