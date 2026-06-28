# How anti-aliasing works

A screen is a grid of squares, and each square can only hold **one flat color**.
But a shape's edge — a diagonal, a curve, the side of a letter — usually cuts
straight *through* a pixel, leaving it part shape and part background. Since the
pixel must pick a single color, it's forced into a yes/no answer: **"am I inside
the shape, or not?"** Along a slanted edge those all-or-nothing choices line up
into a **staircase** — that staircase is **aliasing**.

Anti-aliasing fixes it by letting those edge pixels answer with a fraction
instead: **"how much of me is inside?"** A pixel that's 30% covered becomes 30%
of the way from background to shape. The hard yes/no softens into a gradient, and
your eye reads the smooth edge the grid could never actually draw.

This is exactly what our code in [`raster.ts`](./raster.ts) does.

---

## The detail

### Terms (read these first)

- `pixel` = "one square cell of the screen; it can only be a single flat color."
- `inside()` = "a yes/no test: is this exact point covered by the shape?"
- `coverage` = "the fraction of a pixel's area that's inside the shape, from 0 (none) to 1 (all)."
- `samples` / `N` = "how many test points we check per pixel along each axis. `N = 1` means one test; `N = 4` means a 4×4 = 16-point grid."
- `(u, v)` = "a pixel's position rewritten so the center of the canvas is (0, 0) and the short side runs −1..1 — makes shapes resolution-independent."
- `θ` = "the rotation angle, used to tilt the shape so the jaggies are easy to see."
- `FG`, `BG` = "the foreground (shape) and background colors we blend between."

### Step 1: why jaggies happen

An edge is infinitely sharp, but a pixel can only be one color. With a single
test point per pixel, every pixel is *fully* shape or *fully* background:

```
color = inside(center of pixel) ? FG : BG
```

On a diagonal, neighboring pixels flip between FG and BG in chunks → a staircase.
There's no "halfway," so there's nowhere for the smoothness to live.

#### A circle, drawn the default way

This isn't only a diagonal-line problem — it's how a circle lands on a grid too.
Take our circle test, `inside = u'² + v'² ≤ r²`, and run it once per pixel using
that pixel's center point. Every pixel is simply *in* or *out*:

```
for each pixel:
    dx, dy = (pixel center) − (circle center)
    fill if dx² + dy² ≤ r²
```

On a coarse grid, a radius-4 circle comes out like this — each `█` is a pixel the
test said "yes" to:

```
· · █ █ █ █ · ·
· █ █ █ █ █ █ ·
█ █ █ █ █ █ █ █
█ █ █ █ █ █ █ █
█ █ █ █ █ █ █ █
█ █ █ █ █ █ █ █
· █ █ █ █ █ █ ·
· · █ █ █ █ · ·
```

The "round" edge is really a stack of flat ledges — 2 pixels wide, then 4, then
6, then 8. The jaggies are worst where the curve is shallow (the top and sides),
because there the boundary creeps across many pixels while only the yes/no answer
is allowed to change. The circle *is* aliased the moment you draw it; nothing went
wrong — a grid of single-color squares simply can't place a curved edge anywhere
but on a square boundary.

The fix below is the same for the circle as for any edge: stop forcing each border
pixel to be all-or-nothing, and shade it by how much of the disk actually covers
it.

### Step 2: the fix — measure coverage by sampling

The honest color for an edge pixel is a blend, weighted by how much of it the
shape actually covers:

```
color = BG + (FG − BG) · coverage
```

We don't compute `coverage` with calculus — we **estimate it** by testing many
points inside the pixel and counting how many land inside the shape:

```
coverage ≈ (1 / N²) · Σ inside(sample_i)
```

The sample points are spread evenly across the pixel:

```
sample_x = px + (i + 0.5) / N        for i = 0 … N−1
sample_y = py + (j + 0.5) / N        for j = 0 … N−1
```

- `N = 1` → coverage is only ever 0 or 1 → **aliased** (the staircase).
- `N = 4` → coverage can be 0, 1/16, 2/16 … 1 → edge pixels get in-between grays → **smooth**.

This is *supersampling*: sample at higher resolution, average down.

### Step 3: where each sample lands (normalize + rotate)

Each sample point is converted to centered coordinates, then rotated by `−θ` so
we can test against a shape that "stands still":

```
u = (sample_x − width/2)  / (min(width, height) / 2)
v = (sample_y − height/2) / (min(width, height) / 2)

u' = u·cos θ + v·sin θ
v' = −u·sin θ + v·cos θ
```

### Step 4: the inside() tests

Each scene is just a yes/no rule on `(u', v')`:

```
edge      :  v' ≥ 0                                  (a straight half-plane)
circle    :  u'² + v'² ≤ r²                          (distance from center)
polygon   :  for every edge i:  u'·cos(αᵢ) + v'·sin(αᵢ) ≤ r·cos(π/n)
             where αᵢ = 2πi/n + π/2,  n = sides
checker   :  (⌊u'/cell⌋ + ⌊v'/cell⌋) is even
```

A convex polygon (triangle, pentagon) is just the **overlap of `n` half-planes** —
each edge says "stay on my inner side," and `r·cos(π/n)` is the distance from the
center to each edge.

### Why it works in one sentence

A pixel can't be half a color in *position*, but it can be half a color in
*shade* — so we estimate how much of each pixel the shape covers and paint that
exact gray, letting your eye reconstruct the smooth edge.
