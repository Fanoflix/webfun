# StyleFlow — how it works

A per-character typographic *shimmer*. Every character of a string drifts across
four independent style dimensions, one at a time, then the whole run settles back
to a resting look. Unlike CharacterFlow (which morphs one string into another),
StyleFlow keeps the *text* fixed and animates its *typography*.

## Part 1 — the detail

### Glossary

- `track` = "one independent style dimension a character can change." There are
  four: **weight** (medium→bold), **slant** (upright→italic), **family**
  (sans→serif), and **size** (within a tight px range).
- `turn` = "one tick of a character's timeline. On every turn exactly one track
  moves to a new value." A character's run is just a sequence of turns.
- `cooldown` (X) = "how many turns a track must sit out after it moves, before it
  may move again." Default `1`: a track can never change twice in a row.
- `stepInterval` = "seconds between the start of consecutive turns."
- `stepDuration` = "seconds one track's transition takes." (≤ `stepInterval`, so
  transitions don't overlap — and since only one track moves per turn, a
  character is only ever animating one axis at any instant.)
- `duration` = "total run length. Finite — it always ends." The last slice of
  time is the **settle window**, where every track eases home to `restStyle`.
- `slnt` / `wght` = the OpenType variable-font *axes*. `wght` is the numeric
  weight (300–900); `slnt` is the oblique angle (0 → −14°) on the Recursive sans
  face. Both interpolate continuously, which is what makes weight and italic
  *glide* instead of snapping.
- `seed` = "the RNG seed. Same seed ⇒ identical shimmer" (so it is reproducible
  and safe to render on a server and a client without a mismatch).

### The rule (why a track can't repeat)

The whole character of the motion comes from one constraint. Walk the turns
`k = 0, 1, 2, …`. A track `t` is **eligible** on turn `k` only if it has waited
out its cooldown since it last moved on turn `last[t]`:

```
eligible(t, k)  ⇔  k − last[t] > X
```

With `X = 1`, a track that moved on turn `k` is barred on turn `k+1` and only
free again on turn `k+2` — so *something else* must move in between. That is what
stops the shimmer from fidgeting on a single axis (the "wrong" sequence
`bold → semibold → …` — two weight changes back-to-back — can never be
scheduled). Each turn we pick one eligible track (random or round-robin), then a
new value for it:

- discrete tracks (weight / slant / family): a uniform pick from the allowed set
  **excluding the current value**;
- size: a uniform pick in `[min, max]` re-rolled until it is at least `40%` of
  the range away from the current size, so the change is actually visible.

### From schedule to pixels

Each change becomes a two-point ramp in that track's keyframes: hold at the old
value until the turn, then ease to the new value over `stepDuration`. Flat runs
of equal values between turns are the holds. Normalising every keyframe time by
`duration` gives one `times[] → values[]` curve per track, which drives a
`MotionValue`.

Rendering one character:

- A hidden, rest-styled **sizer** copy fixes the cell's width, so weight/size/
  family changes never reflow the neighbours (odometer-style fixed cells).
- Two absolutely-stacked layers — the **Recursive** sans face and the
  **Fraunces** serif face — crossfade for the family track (`opacity = 1−family`
  and `opacity = family`), while both share the weight/slant/size motion values.
- Weight + slant compose into one `font-variation-settings` string
  (`'wght' W, 'slnt' S`); size animates `font-size` directly on the (out-of-flow)
  layers; the serif face flips to its true italic at the slant midpoint.

**Why it works:** typography has several genuinely independent axes, and a
variable font lets most of them interpolate. Change only one at a time, forbid
immediate repeats, and settle at the end, and a static word appears to *breathe*
through its own type family without ever looking random or busy.

## Part 2 — the reel (~20s)

**Hook (0–3s):** Full-screen, one word sitting still. *"This text isn't
changing… watch closer."* The word starts to breathe — a letter thickens, one
leans into italic, another sprouts serifs.

**Beat 1 (3–8s):** Slow-mo on a single letter. On-screen label pops per change:
`WEIGHT ↑`, then `ITALIC`, then `SERIF`, then `SIZE`. *"Four dials. One letter.
One at a time."*

**Beat 2 (8–14s):** Split screen. Left: the same axis flickering twice in a row
— jittery, ugly, big red ✗. Right: our version, buttery. *"The trick is a rule:
a dial can't move twice in a row."*

**Beat 3 (14–18s):** Pull back to the whole word rippling left-to-right, each
letter on its own timeline. *"Every letter runs its own little schedule."*

**Payoff (18–20s):** The shimmer resolves and freezes into a clean wordmark.
*"…and then it settles. Variable fonts are wild."* Handle + "StyleFlow" wordmark.
