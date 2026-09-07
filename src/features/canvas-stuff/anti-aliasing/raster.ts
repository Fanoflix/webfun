// A tiny analytic rasteriser used to *demonstrate* anti-aliasing. Each scene is
// described as an inside/outside test in normalised coordinates; we evaluate it
// at `samples × samples` points per output pixel and average the coverage. With
// one sample the edge is hard (aliased); with more, edge pixels take fractional
// coverage and the jaggies dissolve into a smooth gradient (supersampled AA).

export type Scene =
  | "line"
  | "edge"
  | "circle"
  | "sphere"
  | "triangle"
  | "pentagon"
  | "checker"

export const SCENES: { value: Scene; label: string }[] = [
  { value: "line", label: "Diagonal line" },
  { value: "edge", label: "Slanted edge" },
  { value: "circle", label: "Circle" },
  { value: "sphere", label: "Shaded sphere" },
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
    case "sphere":
      // Same silhouette; the sphere differs only in what it paints *inside*,
      // which is deliberate — the anti-aliasing is happening on this edge and
      // nowhere else.
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

/** Light direction for the shaded sphere, normalised, pointing from the surface. */
const LIGHT: readonly [number, number, number] = [-0.53, -0.58, 0.62]

/**
 * How bright the *interior* of a scene is at `(u, v)`, 0..1.
 *
 * Flat scenes return 1 and cost nothing. The sphere reconstructs a surface
 * normal from the silhouette — `nz = sqrt(1 - nx² - ny²)` — and lights it, so
 * the interior is a smooth gradient while the edge stays a pure coverage
 * problem.
 *
 * Keeping shading separate from coverage is what makes this legitimate: the
 * silhouette is still anti-aliased by supersampling alone, and the Samples
 * slider still does the whole job. A shaded pixel is not a partly-covered one.
 */
function shadeAt(scene: Scene, u: number, v: number, size: number): number {
  if (scene !== "sphere") return 1

  const nx = u / size
  const ny = v / size
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))

  const lambert = Math.max(0, -(nx * LIGHT[0] + ny * LIGHT[1]) + nz * LIGHT[2])
  const specular = lambert ** 48
  // A little rim light, or the dark limb vanishes into the background and the
  // silhouette we came here to look at stops being visible at all.
  const rim = 0.16 * (1 - nz) ** 2

  return Math.min(1, 0.07 + 0.86 * lambert + 0.5 * specular + rim)
}

/**
 * Render a scene.
 *
 * Returns the RGBA buffer *and* the raw per-pixel coverage. Coverage can no
 * longer be read back out of the pixels: with a shaded scene a mid-grey pixel
 * might be fully covered but dimly lit, so anything looking for edges (see
 * `findEdge`) has to be handed the real thing.
 */
export type Render = {
  data: Uint8ClampedArray
  /** Per-pixel coverage, 0..1, row-major. */
  coverage: Float32Array
}

export function render(w: number, h: number, s: AASettings): Render {
  const out = new Uint8ClampedArray(w * h * 4)
  const coverage = new Float32Array(w * h)
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
      let shade = 0
      for (let sy = 0; sy < n; sy++) {
        for (let sx = 0; sx < n; sx++) {
          const u = (px + (sx + 0.5) * inv - w / 2) / half
          const v = (py + (sy + 0.5) * inv - h / 2) / half
          const ru = u * cos + v * sin
          const rv = -u * sin + v * cos
          if (inside(s.scene, ru, rv, s.size, pxNorm)) {
            cov++
            shade += shadeAt(s.scene, ru, rv, s.size)
          }
        }
      }
      const a = cov / total
      // Averaged over the covered samples only: an edge pixel's colour is its
      // own shade blended toward the background by its coverage, not a shade
      // diluted twice.
      const lit = cov > 0 ? shade / cov : 0
      const i = (py * w + px) * 4
      coverage[py * w + px] = a
      out[i] = BG[0] + (FG[0] - BG[0]) * lit * a
      out[i + 1] = BG[1] + (FG[1] - BG[1]) * lit * a
      out[i + 2] = BG[2] + (FG[2] - BG[2]) * lit * a
      out[i + 3] = 255
    }
  }
  return { data: out, coverage }
}

/**
 * The edge pixel nearest the middle of the frame, in normalised (0..1) coords.
 *
 * The loupe used to open at dead centre, which for every scene here is deep
 * *inside* the shape — a flat fill. That made the one instrument capable of
 * settling "is this actually anti-aliased?" show nothing at all until you
 * dragged it somewhere useful.
 *
 * It reads the coverage map rather than the pixels, so it works for any scene
 * without a per-scene table *and* stays correct for shaded ones, where a
 * mid-grey pixel is usually just a dim part of the interior rather than an
 * edge. Ties break towards the centre, so the result is deterministic.
 *
 * Returns `null` when nothing is partially covered (a 1-sample render, or an
 * empty scene), leaving the caller's current centre alone.
 */
export function findEdge(
  coverage: Float32Array,
  w: number,
  h: number
): { x: number; y: number } | null {
  const cx = w / 2
  const cy = h / 2

  let best: { x: number; y: number } | null = null
  let bestDist = Infinity

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const a = coverage[py * w + px]
      if (a <= 0 || a >= 1) continue
      const dx = px + 0.5 - cx
      const dy = py + 0.5 - cy
      const dist = dx * dx + dy * dy
      if (dist < bestDist) {
        bestDist = dist
        best = { x: (px + 0.5) / w, y: (py + 0.5) / h }
      }
    }
  }
  return best
}
