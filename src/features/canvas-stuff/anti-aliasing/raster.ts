// A tiny analytic rasteriser used to *demonstrate* anti-aliasing. Each scene is
// described as an inside/outside test in normalised coordinates; we evaluate it
// at `samples × samples` points per output pixel and average the coverage. With
// one sample the edge is hard (aliased); with more, edge pixels take fractional
// coverage and the jaggies dissolve into a smooth gradient (supersampled AA).

export type Scene =
  | "line"
  | "edge"
  | "circle"
  | "triangle"
  | "pentagon"
  | "checker"

export const SCENES: { value: Scene; label: string }[] = [
  { value: "line", label: "Diagonal line" },
  { value: "edge", label: "Slanted edge" },
  { value: "circle", label: "Circle" },
  { value: "triangle", label: "Triangle" },
  { value: "pentagon", label: "Pentagon" },
  { value: "checker", label: "Checkerboard" },
]

export type AASettings = {
  scene: Scene
  /** Supersampling factor per axis. 1 = no anti-aliasing. */
  samples: number
  /** Rotation in degrees — tilt the shape to expose the jaggies. */
  angle: number
  /** Shape size / pattern scale, 0..1. */
  size: number
  /** Base render width in pixels (lower = chunkier, more visible aliasing). */
  resolution: number
}

export const MIN_SAMPLES = 1
export const MAX_SAMPLES = 8
export const MIN_RES = 60
export const MAX_RES = 480
export const SCENE_ASPECT = 3 / 2

const FG: readonly [number, number, number] = [236, 236, 240]
const BG: readonly [number, number, number] = [18, 18, 22]

/** Convex regular polygon: intersection of `n` half-planes at the apothem. */
function insidePolygon(u: number, v: number, n: number, r: number) {
  const apothem = r * Math.cos(Math.PI / n)
  for (let i = 0; i < n; i++) {
    const ang = (2 * Math.PI * i) / n + Math.PI / 2
    if (u * Math.cos(ang) + v * Math.sin(ang) > apothem) return false
  }
  return true
}

/**
 * `(u, v)` are centred, rotation-applied, normalised so the short axis is 1.
 * `pxNorm` is the width of one output pixel in those same units.
 */
function inside(
  scene: Scene,
  u: number,
  v: number,
  size: number,
  pxNorm: number
) {
  switch (scene) {
    case "line":
      // Exactly one pixel thick, so you can watch a thin line get
      // anti-aliased. `size` doesn't affect it.
      return Math.abs(v) <= 0.5 * pxNorm
    case "edge":
      return v >= 0
    case "circle":
      return u * u + v * v <= size * size
    case "triangle":
      return insidePolygon(u, v, 3, size)
    case "pentagon":
      return insidePolygon(u, v, 5, size)
    case "checker": {
      const cell = 0.08 + size * 0.3
      return ((Math.floor(u / cell) + Math.floor(v / cell)) & 1) === 0
    }
  }
}

/** Render a scene to a fresh RGBA buffer of length `w * h * 4`. */
export function render(w: number, h: number, s: AASettings): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4)
  const half = Math.min(w, h) / 2
  // One output pixel, measured in the normalised (u, v) units inside().
  const pxNorm = 1 / half
  const rad = (s.angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const n = Math.max(1, Math.min(MAX_SAMPLES, Math.round(s.samples)))
  const inv = 1 / n
  const total = n * n

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      let cov = 0
      for (let sy = 0; sy < n; sy++) {
        for (let sx = 0; sx < n; sx++) {
          const u = (px + (sx + 0.5) * inv - w / 2) / half
          const v = (py + (sy + 0.5) * inv - h / 2) / half
          const ru = u * cos + v * sin
          const rv = -u * sin + v * cos
          if (inside(s.scene, ru, rv, s.size, pxNorm)) cov++
        }
      }
      const a = cov / total
      const i = (py * w + px) * 4
      out[i] = BG[0] + (FG[0] - BG[0]) * a
      out[i + 1] = BG[1] + (FG[1] - BG[1]) * a
      out[i + 2] = BG[2] + (FG[2] - BG[2]) * a
      out[i + 3] = 255
    }
  }
  return out
}
