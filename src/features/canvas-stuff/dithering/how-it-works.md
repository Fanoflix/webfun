# How dithering works

Dithering lets you show a picture using **very few colors** while your eye still
reads all the shades. The trick: instead of rounding every pixel to the nearest
available color (which throws away detail), you round them in a *clever pattern*
so the colors are correct **on average** across any small patch.

This is exactly what our code in [`pipeline.ts`](./pipeline.ts) does.

---

## The detail

### Terms (read these first)

- `v` = "the value of one pixel, from 0 (black) to 255 (white). For color, each of R, G, B has its own `v`."
- `Y` = "brightness (luminance) of a color pixel — one number that says how light it looks."
- `levels` = "how many shades we're allowed to keep per channel. `levels = 2` means black & white only."
- `step` = "the size of the gap between two allowed shades."
- `quant(v)` = "round `v` to the nearest allowed shade."
- `err` = "the rounding mistake: how far the true value was from the shade we picked."
- `M` = "an ordered grid of thresholds (the Bayer matrix) that decides, per pixel, whether to round up or down."
- `f` = "the contrast multiplier — bigger than 1 pushes lights/darks apart, smaller pulls them together."

### Step 1: turn color into brightness (grayscale mode only)

A color pixel becomes one brightness number. Green counts most because our eyes
are most sensitive to it:

```
Y = 0.299·R + 0.587·G + 0.114·B
```

### Step 2: contrast (optional)

With a contrast slider value `c` from −100..100, we build a multiplier and apply
it around mid-grey (128):

```
f = (259 · (c + 255)) / (255 · (259 − c))
adjusted = f · (v − 128) + 128
```

`v − 128` re-centers so mid-grey stays put; multiplying by `f` stretches the rest.

### Step 3: the allowed shades

If we keep `levels` shades, they are evenly spaced across 0..255:

```
step  = 255 / (levels − 1)
quant(v) = round(v / step) · step
```

If you stop here, you get **posterize**: flat bands of color. Dithering is what
you add *before* `quant` to hide those bands.

### Step 4: dither — three flavours of the same idea

The whole game is to nudge each pixel up or down before rounding, so the errors
cancel out over a neighborhood.

**Ordered (Bayer).** A fixed threshold grid `M` (values normalized to 0..1) is
tiled across the image. Each pixel gets nudged by its grid cell:

```
nudged = v + (M[x mod n, y mod n] − 0.5) · step
output = quant(nudged)
```

The `M` grid is built by a doubling rule, starting from `[[0]]`:

```
M2n = [ 4M+0   4M+2 ]
      [ 4M+3   4M+1 ]
```

This scatters the "round up" decisions into the classic cross-hatch pattern.

**Random.** Same nudge, but random instead of a grid → film-grain look:

```
output = quant(v + (random − 0.5) · step)
```

**Error diffusion (Floyd–Steinberg & friends).** The strongest method. Round the
pixel, measure the mistake, then **push that mistake onto neighbors you haven't
visited yet** so they compensate:

```
new   = quant(old)
err   = old − new
neighbor += err · weight / divisor
```

Floyd–Steinberg spreads the error to 4 neighbors with weights summing to 16:

```
        (current)   7
   3        5        1     ÷ 16
```

Other kernels (Jarvis, Stucki, Atkinson…) just spread the error wider with
different weights — smoother, at the cost of a little contrast.

### Why it works in one sentence

Rounding throws away a little bit of brightness at every pixel; dithering makes
sure that thrown-away brightness is *added back to the pixels next door*, so any
patch of the image still sums to the right amount of light — and your eye blurs
the pattern into the original shade.
