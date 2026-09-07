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
  it("finds an edge for every scene, so the loupe is never parked on flat fill", () => {
    for (const { value } of SCENES) {
      const { coverage } = render(W, H, { ...BASE, scene: value })
      const edge = findEdge(coverage, W, H)
      expect(edge, `scene ${value}`).not.toBeNull()

      const px = Math.floor(edge!.x * W)
      const py = Math.floor(edge!.y * H)
      const a = coverage[py * W + px]
      expect(a, `scene ${value}`).toBeGreaterThan(0)
      expect(a, `scene ${value}`).toBeLessThan(1)
    }
  })

  it("returns null when nothing is partially covered", () => {
    // One sample per pixel is a yes/no answer, so no pixel is ever partial.
    const { coverage } = render(W, H, { ...BASE, samples: 1 })
    expect(findEdge(coverage, W, H)).toBeNull()
  })

  it("prefers the edge nearest the middle of the frame", () => {
    const { coverage } = render(W, H, BASE)
    const edge = findEdge(coverage, W, H)!

    const cx = W / 2
    const cy = H / 2
    const dist = (x: number, y: number) => (x - cx) ** 2 + (y - cy) ** 2
    const chosen = dist(edge.x * W, edge.y * H)

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const a = coverage[py * W + px]
        if (a <= 0 || a >= 1) continue
        expect(dist(px + 0.5, py + 0.5)).toBeGreaterThanOrEqual(chosen - 1e-9)
      }
    }
  })

  it("is not fooled by a shaded interior", () => {
    // The sphere's inside is a gradient, so plenty of its pixels are mid-grey
    // without being edge pixels. Reading coverage rather than colour is what
    // keeps this honest.
    const { data, coverage } = render(W, H, { ...BASE, scene: "sphere" })
    const edge = findEdge(coverage, W, H)!
    const px = Math.floor(edge.x * W)
    const py = Math.floor(edge.y * H)

    expect(coverage[py * W + px]).toBeGreaterThan(0)
    expect(coverage[py * W + px]).toBeLessThan(1)

    // Prove the trap exists: some fully-covered pixel is mid-grey too.
    let litMidTone = false
    for (let i = 0; i < coverage.length; i++) {
      const r = data[i * 4]
      if (coverage[i] === 1 && r > 40 && r < 200) litMidTone = true
    }
    expect(litMidTone).toBe(true)
  })
})

describe("render", () => {
  it("anti-aliases the silhouette of a shaded sphere", () => {
    const aliased = render(W, H, { ...BASE, scene: "sphere", samples: 1 })
    const smooth = render(W, H, { ...BASE, scene: "sphere", samples: 4 })

    const partial = (c: Float32Array) =>
      [...c].filter((a) => a > 0 && a < 1).length

    // Samples is still doing the whole job on the edge; shading never creates
    // partial coverage.
    expect(partial(aliased.coverage)).toBe(0)
    expect(partial(smooth.coverage)).toBeGreaterThan(0)
  })

  it("leaves flat scenes unshaded", () => {
    const { data, coverage } = render(W, H, { ...BASE, scene: "circle" })
    // Every fully covered pixel of a flat scene is the same foreground colour.
    const insides = new Set<number>()
    for (let i = 0; i < coverage.length; i++) {
      if (coverage[i] === 1) insides.add(data[i * 4])
    }
    expect(insides.size).toBe(1)
  })
})
