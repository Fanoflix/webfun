/**
 * Pure dithering pipeline. Given a source `ImageData` (already downsampled to
 * the working resolution) and the chosen settings, returns a fresh RGBA buffer
 * of the same dimensions with the dithering applied. No DOM, no allocations the
 * caller can't see — easy to unit test and to move to a worker later.
 */

export type Algorithm =
  | "none"
  | "random"
  | "bayer2"
  | "bayer4"
  | "bayer8"
  | "floyd"
  | "jjn"
  | "stucki"
  | "burkes"
  | "sierra"
  | "sierra2"
  | "sierraLite"
  | "atkinson"

export type ColorMode = "grayscale" | "rgb"

export type DitherSettings = {
  algorithm: Algorithm
  colorMode: ColorMode
  /** Quantisation steps per channel (2 = 1-bit). */
  levels: number
  /** Downsample factor applied before dithering (chunkier dots). */
  pixelScale: number
  /** -100..100, applied around mid-grey before dithering. */
  contrast: number
  invert: boolean
}

/** Quantisation steps per channel; 2 = pure 1-bit. */
export const MIN_LEVELS = 2
export const MAX_LEVELS = 32

export type AlgorithmGroup = {
  label: string
  options: { value: Algorithm; label: string }[]
}

/** Algorithms grouped by family, for the sectioned dropdown. */
export const ALGORITHM_GROUPS: AlgorithmGroup[] = [
  {
    label: "Threshold",
    options: [
      { value: "none", label: "Posterize (no dither)" },
      { value: "random", label: "Random" },
    ],
  },
  {
    label: "Ordered (Bayer)",
    options: [
      { value: "bayer2", label: "Bayer 2×2" },
      { value: "bayer4", label: "Bayer 4×4" },
      { value: "bayer8", label: "Bayer 8×8" },
    ],
  },
  {
    label: "Error diffusion",
    options: [
      { value: "floyd", label: "Floyd–Steinberg" },
      { value: "jjn", label: "Jarvis–Judice–Ninke" },
      { value: "stucki", label: "Stucki" },
      { value: "burkes", label: "Burkes" },
      { value: "sierra", label: "Sierra" },
      { value: "sierra2", label: "Sierra Two-Row" },
      { value: "sierraLite", label: "Sierra Lite" },
      { value: "atkinson", label: "Atkinson" },
    ],
  },
]

export const COLOR_MODES: { value: ColorMode; label: string }[] = [
  { value: "grayscale", label: "Grayscale" },
  { value: "rgb", label: "Color (RGB)" },
]

// Error-diffusion kernels as [dx, dy, weight]; weights are divided by `divisor`.
type Diffusion = { divisor: number; kernel: [number, number, number][] }

const DIFFUSION: Partial<Record<Algorithm, Diffusion>> = {
  floyd: {
    divisor: 16,
    kernel: [
      [1, 0, 7],
      [-1, 1, 3],
      [0, 1, 5],
      [1, 1, 1],
    ],
  },
  jjn: {
    divisor: 48,
    kernel: [
      [1, 0, 7],
      [2, 0, 5],
      [-2, 1, 3],
      [-1, 1, 5],
      [0, 1, 7],
      [1, 1, 5],
      [2, 1, 3],
      [-2, 2, 1],
      [-1, 2, 3],
      [0, 2, 5],
      [1, 2, 3],
      [2, 2, 1],
    ],
  },
  stucki: {
    divisor: 42,
    kernel: [
      [1, 0, 8],
      [2, 0, 4],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 8],
      [1, 1, 4],
      [2, 1, 2],
      [-2, 2, 1],
      [-1, 2, 2],
      [0, 2, 4],
      [1, 2, 2],
      [2, 2, 1],
    ],
  },
  burkes: {
    divisor: 32,
    kernel: [
      [1, 0, 8],
      [2, 0, 4],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 8],
      [1, 1, 4],
      [2, 1, 2],
    ],
  },
  sierra: {
    divisor: 32,
    kernel: [
      [1, 0, 5],
      [2, 0, 3],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 5],
      [1, 1, 4],
      [2, 1, 2],
      [-1, 2, 2],
      [0, 2, 3],
      [1, 2, 2],
    ],
  },
  sierra2: {
    divisor: 16,
    kernel: [
      [1, 0, 4],
      [2, 0, 3],
      [-2, 1, 1],
      [-1, 1, 2],
      [0, 1, 3],
      [1, 1, 2],
      [2, 1, 1],
    ],
  },
  sierraLite: {
    divisor: 4,
    kernel: [
      [1, 0, 2],
      [-1, 1, 1],
      [0, 1, 1],
    ],
  },
  atkinson: {
    divisor: 8,
    kernel: [
      [1, 0, 1],
      [2, 0, 1],
      [-1, 1, 1],
      [0, 1, 1],
      [1, 1, 1],
      [0, 2, 1],
    ],
  },
}

// Recursive Bayer matrix; returns thresholds normalised to [0, 1).
const bayerCache = new Map<number, Float32Array>()
function bayerThresholds(n: number): Float32Array {
  const cached = bayerCache.get(n)
  if (cached) return cached
  let m: number[][] = [[0]]
  let size = 1
  while (size < n) {
    const next: number[][] = Array.from(
      { length: size * 2 },
      () => new Array<number>(size * 2)
    )
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = m[y][x]
        next[y][x] = 4 * v
        next[y][x + size] = 4 * v + 2
        next[y + size][x] = 4 * v + 3
        next[y + size][x + size] = 4 * v + 1
      }
    }
    m = next
    size *= 2
  }
  const out = new Float32Array(n * n)
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) out[y * n + x] = (m[y][x] + 0.5) / (n * n)
  bayerCache.set(n, out)
  return out
}

function contrastFactor(contrast: number) {
  // Map -100..100 to the standard -255..255 contrast constant.
  const c = (contrast / 100) * 255
  return (259 * (c + 255)) / (255 * (259 - c))
}

export function dither(src: ImageData, s: DitherSettings): Uint8ClampedArray {
  const { width, height } = src
  const sd = src.data
  const ch = s.colorMode === "grayscale" ? 1 : 3
  const px = width * height
  const buf = new Float32Array(px * ch)

  const f = contrastFactor(s.contrast)
  const adjust = (v: number) => {
    let out = f * (v - 128) + 128
    if (s.invert) out = 255 - out
    return out < 0 ? 0 : out > 255 ? 255 : out
  }

  // Load pixels (grey via luminance, or per-channel) with contrast/invert.
  for (let p = 0, i = 0; p < px; p++) {
    const o = p * 4
    if (ch === 1) {
      buf[i++] = adjust(0.299 * sd[o] + 0.587 * sd[o + 1] + 0.114 * sd[o + 2])
    } else {
      buf[i++] = adjust(sd[o])
      buf[i++] = adjust(sd[o + 1])
      buf[i++] = adjust(sd[o + 2])
    }
  }

  const levels = Math.max(MIN_LEVELS, Math.min(MAX_LEVELS, s.levels))
  const step = 255 / (levels - 1)
  const quant = (v: number) => {
    const q = Math.round(v / step) * step
    return q < 0 ? 0 : q > 255 ? 255 : q
  }

  const diffusion = DIFFUSION[s.algorithm]

  if (s.algorithm === "none") {
    for (let i = 0; i < buf.length; i++) buf[i] = quant(buf[i])
  } else if (s.algorithm === "random") {
    for (let i = 0; i < buf.length; i++) {
      buf[i] = quant(buf[i] + (Math.random() - 0.5) * step)
    }
  } else if (s.algorithm.startsWith("bayer")) {
    const n = s.algorithm === "bayer2" ? 2 : s.algorithm === "bayer4" ? 4 : 8
    const M = bayerThresholds(n)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = M[(y % n) * n + (x % n)]
        const base = (y * width + x) * ch
        for (let k = 0; k < ch; k++) {
          buf[base + k] = quant(buf[base + k] + (t - 0.5) * step)
        }
      }
    }
  } else if (diffusion) {
    const { kernel, divisor } = diffusion
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const base = (y * width + x) * ch
        for (let k = 0; k < ch; k++) {
          const old = buf[base + k]
          const nv = quant(old)
          buf[base + k] = nv
          const err = old - nv
          for (const [dx, dy, wgt] of kernel) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || nx >= width || ny >= height) continue
            buf[(ny * width + nx) * ch + k] += (err * wgt) / divisor
          }
        }
      }
    }
  }

  // Write back to RGBA.
  const out = new Uint8ClampedArray(px * 4)
  for (let p = 0, i = 0; p < px; p++) {
    const o = p * 4
    if (ch === 1) {
      const v = buf[i++]
      out[o] = v
      out[o + 1] = v
      out[o + 2] = v
    } else {
      out[o] = buf[i++]
      out[o + 1] = buf[i++]
      out[o + 2] = buf[i++]
    }
    out[o + 3] = 255
  }
  return out
}

/** Count distinct RGB triples in an RGBA buffer (for the stats readout). */
export function countUniqueColors(data: Uint8ClampedArray): number {
  const seen = new Set<number>()
  for (let o = 0; o < data.length; o += 4) {
    seen.add((data[o] << 16) | (data[o + 1] << 8) | data[o + 2])
  }
  return seen.size
}
