# How low-res video works

This tool turns any video into a **dot screen** — the look of an LED video wall,
a stadium scoreboard, or a Lite-Brite. It does it in two moves: first shrink the
video down to a tiny grid of colors, then blow each of those colors back up as a
single glowing **dot** surrounded by dark gaps.

This is exactly what our code does, split across
[`useVideoFrames.ts`](./useVideoFrames.ts) (the shrink) and
[`PixelScreen.tsx`](./PixelScreen.tsx) (the dots).

---

## The detail

### Terms (read these first)

- `cols`, `rows` = "the low-res grid — how many dots across and down. This _is_ the real resolution; everything else is just how big we draw it."
- `cell` = "the square block of screen pixels that one grid color gets blown up into."
- `dot` = "the lit shape (circle, square, or diamond) sitting inside a cell."
- `gap` = "the dark border left around each dot — what sells the LED-wall look."
- `dpr` = "device pixel ratio: how many physical pixels per CSS pixel (e.g. 2 on a retina screen)."
- `cellPx` = "the size of one cell in physical pixels — an integer, on purpose."
- `dotPx` = "the size of the lit dot inside the cell, in physical pixels."

### Step 1: shrink the video to a grid of colors

We draw the current video frame into a tiny offscreen canvas that is exactly
`cols × rows` big:

```
drawImage(video, 0, 0, cols, rows)
```

That one call does the important work: to fit, say, a 1920-wide frame into 64
cells, the browser **averages** each ~30×30 patch of the video into one color.
So every grid cell already holds the average color of the region it covers — no
detail is "picked," it's blended. Reading the bytes back gives a `cols × rows`
array of RGBA colors. That's the whole picture, now.

### Step 2: blow each color up into a cell

Each grid color becomes a `cellPx × cellPx` block. The cell size is chosen to
roughly fill the frame's width on screen, then **rounded to a whole number** and
capped so the canvas never gets huge:

```
cellPx = round( (frameWidth · dpr) / cols )        // clamped ≥ 1, and capped
```

Rounding to an integer matters: if cells were 12.7 px wide, every dot would land
on slightly different pixel boundaries and the screen would shimmer (moiré). With
identical integer cells, every dot is pixel-for-pixel the same.

> Note: `cols × rows` (the resolution) is independent of `cellPx` (how big we
> draw it). Resizing the frame changes the cell size, not the dot count — so the
> picture stays equally chunky, just larger or smaller.

### Step 3: carve a dot out of each cell

A cell isn't filled edge to edge — only a `dotPx`-sized dot is lit, and the rest
stays dark. The dot/gap split comes straight from the sliders:

```
dotPx = round( dot / (dot + gap) · cellPx )        // clamped to 1 … cellPx
```

Bigger `gap` → smaller dots → more of that pegboard look.

### Step 4: which pixels light up

For a pixel sitting at offset `(fx, fy)` inside its cell (with `half = dotPx / 2`),
we test whether it's inside the chosen dot shape:

```
square   :  fx < dotPx  and  fy < dotPx           (fill the whole dot box)
circle   :  (fx − half)² + (fy − half)² ≤ half²    (distance from the dot center)
diamond  :  |fx − half| + |fy − half| ≤ half       (Manhattan distance)
```

If the pixel is inside, it takes its **cell's averaged color**; if not, it's
transparent and the black background shows through as the gap. Do this for every
pixel and the averaged grid reappears as a wall of glowing dots.

### Why it works in one sentence

Shrinking averages the video into a handful of honest colors, and drawing each
one as a lone dot on black lets your eye merge the dots back into the moving
image — the same way a real LED wall does.
