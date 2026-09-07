# How concept chat works

A chat message is normally one lump of text that arrives all at once. This one
can carry **timing**: it arrives as a poster with a play button, and pressing
play makes it perform itself — lines landing one after another, at the pace the
sender chose.

The design constraint that shaped everything: a timeline message must be the
*same kind of thing* as a plain message. Not a second message type, not a second
renderer, not a second storage shape. One body, one code path, and timing is
just something a segment may or may not carry.

This is exactly what our code in [`engine/beats.ts`](./engine/beats.ts) does.

---

## The detail

### Terms (read these first)

- `segment` = "one piece of a message body — a line of text, an image, a link."
- `body` = "a flat `Segment[]`. This is what's stored and what's sent. There is no other shape."
- `timing` = "an optional `{ hold, enter }` on a segment. Its presence is the whole signal."
- `beat` = "one step of a performance: the segments that land together."
- `hold` = "milliseconds a beat stays alone before the next lands."
- `enter` = "how a beat arrives — `fade` by default."
- `run` = "one playthrough."

### Step 1: beats are derived, never stored

The body stays flat on disk and in state. Beats are computed on the way to the
screen, by one rule:

> **Timing starts a beat. No timing joins the one before.**

```
opensBeat(i) = i === 0 || segment.timing !== undefined
```

The first segment always opens a beat whether or not it carries timing. That
single clause is why there's no special case for plain messages: a body with no
timing anywhere yields **exactly one beat containing everything**, which renders
identically to a static message and reaches the screen through the same code
path. A static message isn't a different branch — it's a one-beat performance.

### Step 2: the round trip is the identity

The composer works in beats; storage works in bodies. Going back down, timing is
written onto each beat's *opening* segment and stripped from every other:

```
toBeats(flatten(beats))  ≡  beats     (on structure)
```

And one beat flattens to a body with no timing at all — precisely a plain
message. So "remove the timing from this message" isn't an operation the code
has to implement; it's what collapsing to one beat already means.

### Step 3: how long it runs

```
totalDuration = Σ hold(beat)   for every beat except the last
```

The final beat's hold is excluded on purpose: a hold is a *gap before the next
beat*, and after the last one there is no next beat. Counting it would leave the
message sitting there having visibly finished, waiting out a timer for nothing.

Default hold is `1500ms`; the composer offers presets but always prints the real
number next to the friendly label, so the name never hides what's being chosen.

### Step 4: playback is a count, not a cursor

The entire performance is one number: **how many beats are visible.**

Beats accumulate rather than replace. There's no current-beat pointer, nothing
to tear down between steps, and no window where two things are on screen at
once. Idle sits at `visibleCount = 1` — the poster *is* the first beat, already
rendered, which is why the message has a sensible resting state without a
separate preview.

A `runId` increments on each run and is used as the React key, so starting a run
re-mounts the beats and they animate in again — including the first one, which
was already on screen and would otherwise sit motionless while everything after
it performed.

Replay winds the beats back down to empty first. The playback state carries
`fromCleared` so the first beat knows which it is: arriving into empty space it
should grow in like any other beat, but arriving over a poster of exactly its
own height it must only fade — otherwise the message collapses and re-expands
for no reason.

An idle message runs **no timers at all**. The only effect is unmount cleanup,
which exists because a pending timeout outliving the component would set state
on something that no longer exists.

### Step 5: the thread groups itself

The view never groups, never sorts, and never decides where a date divider goes.
One pure function turns a flat message list into what gets rendered:

```
continues = sameAuthor && (message.sentAt − lastSentAt(group)) ≤ 5 min
```

The gap is measured from the **previous message**, not the run's start — so a
steady back-and-forth stays one group instead of splitting every five minutes no
matter how continuous the conversation is.

A new calendar day always closes the open run, because a group must never
straddle the divider that would be drawn between its own messages.

### Step 6: time is passed in, never read

Every formatter takes `now` as an argument and reads no clock of its own:

```
< 60s  → "Just now"
< 1h   → "5m"
same day → "3h"
1 day  → "Yesterday"
else   → "12 Mar"   (plus the year, once it's a different one)
```

That makes each one directly testable, and it means the whole list re-derives
its labels from a **single shared tick** rather than every timestamp holding its
own timer. Days are counted by calendar day, not elapsed hours, so 11pm →
1am is "Yesterday" rather than "2h".

Future timestamps — clock skew, a restored thread — clamp to `Just now` instead
of rendering a negative age, and the countdown clamps at zero rather than
flashing `-0:01` when a render lands a few milliseconds the wrong side of
expiry.

### Why it works in one sentence

Make timing an optional property of a segment rather than a property of a
message, and a performed message stops being a new feature — it's the same
message, played.
