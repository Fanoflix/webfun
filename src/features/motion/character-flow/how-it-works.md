# How CharacterFlow works

CharacterFlow animates one string into another the way an odometer or a
departure board does: the letters that both strings share **slide** to their new
place, and only the letters that genuinely changed **roll** away and roll in.

The hard part isn't the animation. It's deciding *which letters are the same
letter* — and doing it so that a shared run like the `lich` in `Lichking` →
`Lichbane` stays one set of elements rather than four letters that happen to
match four other letters somewhere else in the word.

This is exactly what our code in [`CharacterFlow.tsx`](./CharacterFlow.tsx)
does.

---

## The detail

### Terms (read these first)

- `slot` = "one character position on screen, carrying an **id** that survives a value change."
- `LCS` = "longest common subsequence — the longest run of characters that appears in both strings *in the same order*, though not necessarily side by side."
- `anchor` = "a pair `(ai, bi)`: character `ai` of the old string is the same character as `bi` of the new one."
- `entering` = "a character with no anchor — it wasn't on screen last render."
- `roll` = "the vertical travel, in `em`, a character moves as it enters or exits."
- `layout slide` = "the *horizontal* move a surviving character makes when the string grows or shrinks."

### Step 1: match the old string to the new one

Everything rests on this. We compute the LCS with the standard table, filled
from the bottom-right so `dp[i][j]` means "longest match still available from
`a[i]` and `b[j]` onward":

```
dp[i][j] = a[i] === b[j]
             ? dp[i+1][j+1] + 1
             : max(dp[i+1][j], dp[i][j+1])
```

Then we walk forward from `(0, 0)` and emit an anchor whenever the characters
agree, stepping whichever side the table says has more left to gain.

Two properties matter, and both come free with LCS:

- **Anchors never cross.** They're emitted in increasing order on both sides, so
  a surviving letter can never be asked to slide *past* another survivor.
- **Contiguous runs match as a block.** A greedy "find this letter anywhere"
  approach would happily pair the `e` in `the` with the `e` in `theme`'s tail
  and drag it across the whole word. LCS won't.

### Step 2: hand out ids

Anchored characters inherit the old slot's id. Everything else gets a fresh one
from a counter:

```
slot(j) = anchored(j) ? { id: prev[ai].id, char }
                      : { id: nextId++,    char }
```

The id is the React key. That single choice is what makes the rest work: an
unchanged id means React *moves* the element (Framer's `layout="position"`
slides it), and a new id means it mounts (so it rolls in). Nothing else in the
component asks "did this change?" — the ids already answered.

### Step 3: only new characters cascade

Entering characters are ranked **among themselves**, not by their position in
the string:

```
staggerDelay(rank) =
  from "first"  → rank · step
  from "last"   → (count − 1 − rank) · step
  from "center" → |rank − (count − 1)/2| · step
```

Ranking by string index instead would mean appending one letter to a 12-letter
word inherits an 12-step delay and appears to lag. Survivors get no delay at
all, so a one-character edit stays snappy.

### Step 4: how far a character rolls

A character that changed a lot travels farther than one that barely changed —
and since both take the same time, the big change *moves faster*. That's the
NumberFlow signature, and it's two lines:

```
charDistance(a, b) = min(1, |code(a) − code(b)| / 9)
travel             = rollDistance · (1 + distanceScale · charDistance)
```

The `/ 9` is calibrated for digits: `1 → 9` is the largest single-digit jump and
saturates the scale at 1. Letters reuse the same ramp, which is not
linguistically meaningful but reads correctly — near-neighbours in the alphabet
feel like small changes. `distanceScale = 0` makes every roll identical.

### Step 5: split the two axes

Each character is **two nested spans**:

| Span | Owns | Why |
|---|---|---|
| outer | horizontal `layout="position"` | FLIPs a survivor to its new x with a GPU transform |
| inner | vertical `y` + `opacity` | the roll and fade of enter / exit |

If one element owned both, a character that is simultaneously sliding right and
rolling up would compose into a **diagonal**. Splitting them keeps the roll
strictly vertical while the slide happens underneath it.

`AnimatePresence mode="popLayout"` takes exiting characters out of flow
immediately, so survivors start reflowing the moment a letter leaves rather than
waiting for its exit to finish.

### Step 6: the timings that make it read as a roll

Enter and exit run in **opposite** directions around the same axis:

```
enter: y from  dir · travel        → 0
exit:  y from  0 → −dir · rollDistance
```

so at a changed position the outgoing letter rolls up and out while the incoming
one rolls up and in beneath it. That's the odometer read — one letter scrolling
to the next, rather than the whole word blinking out and a new one appearing.

The vertical move is deliberately **faster than the fade's envelope**:

```
y duration       = duration / 3
opacity duration = max(0.1, duration / 3)
```

with `duration = 0.7s` by default. The character arrives in place early and
spends the rest of the budget settling in opacity, which is what stops it
looking like it's still drifting after it's landed. The horizontal slide keeps
its own default (`0.3s`) so roll speed and layout speed tune independently.

### Accessibility

The animated characters are all `aria-hidden`; the wrapper carries
`aria-label={value}`, so a screen reader hears the word once instead of a
letter-by-letter stream. With `prefers-reduced-motion`, the component renders
plain text and does nothing at all.

### Why it works in one sentence

Match the two strings with LCS so identity is decided *before* any animation
exists, then let React's keys do the rest — survivors move because their id
didn't change, and everything else rolls because it's genuinely new.
