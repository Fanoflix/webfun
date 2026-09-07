# How the future table works

A normal table renders a list. When the data changes, a new list appears and
everything on screen jumps to a new position — you re-find your place by
reading.

This one inverts that. It renders a **fixed number of slots** that live at fixed
positions and never move. Data is projected *into* them, and a slot whose
contents changed flips over in place, like a split-flap departure board. Rows
never move, so there is nothing for your eyes to track.

This is exactly what our code in [`engine/core.ts`](./engine/core.ts) does.

---

## The detail

### Terms (read these first)

- `slot` = "a fixed position in the table. Slot 3 is the fourth row on screen, always, whatever data is in it."
- `rowCount` = "how many slots exist. Set once; never derived from how much data arrived."
- `projection` = "the mapping from data to slots. Pure — same inputs, same output."
- `snapshot` = "what every slot showed on the previous render, kept so the next one can diff against it."
- `phase` = "what a slot should be doing right now: `idle`, `filling`, `clearing`, or `updating`."
- `empty slot` = "a slot with no data behind it — rendered as a placeholder, not omitted."

### Step 1: slots come first, data second

The whole inversion is one line:

```
slot i  ↔  data[pageIndex · rowCount + i]
```

`rowCount` is an input, not a result. Ask for 10 slots and you get 10 rows
whether the data has 100 entries, 3, or none — the last case being a table that
is fully laid out and completely empty, which is exactly what you want on first
paint instead of a collapsed box that expands later.

Page count follows from the same arithmetic:

```
pageCount = max(1, ceil(data.length / rowCount))
```

The `max(1, …)` keeps an empty dataset at one page rather than zero, so the
pager has something coherent to show.

### Step 2: cells are addressed by position, not by record

Every cell gets an id built from **where it is**, never from what's in it:

```
cellId = `${slotIndex}:${columnId}`
```

This is the load-bearing decision. In a normal table the key is the record id,
so when the data changes React unmounts one row and mounts another — the DOM
node is different, and any animation is an exit plus an enter. Here the key is
the position, so **the DOM node persists** and the change is a value swap inside
a node that never went anywhere. That is what makes a flip-in-place possible at
all.

### Step 3: the phase comes from a diff, not from an event

Nothing tells a cell it changed. Each render compares the slot's new state to
the snapshot of its old one:

| previous | now | phase |
|---|---|---|
| — (no history) | anything | `idle` |
| empty | filled | `filling` |
| filled | empty | `clearing` |
| filled | filled, different record | `updating` |
| filled | filled, same record, different value | `updating` |
| filled | filled, same record, same value | `idle` |

Two details worth their own line:

- **First render is always `idle`**, deliberately. With no history there's no
  transition to show, and animating every slot on mount would turn arriving at
  the page into a light show.
- **A different record in the slot always animates**, even when this particular
  column's value is identical. Two people both named "Active" in a status column
  are still two different people arriving, and a slot that sat still would
  quietly lie about that.

Value comparison uses `Object.is`, so `NaN` matches itself and `+0` / `-0` don't
collide.

### Step 4: pagination is re-projection

Turning the page doesn't rebuild anything. It changes `pageIndex`, which changes
which record each slot maps to, which makes every occupied slot's `rowId`
differ — so the whole board flips at once, in place, with no layout change,
because the slots themselves never moved.

An in-between page (say 7 records across 10 slots) fills three slots with
`clearing` and leaves the table exactly the same height it was.

### Step 5: what an empty slot renders

Empty cells are not blank. They render a placeholder string, resolved by
layering three levels — **system ← global ← column**, later wins:

```
resolved = { ...SYSTEM_EMPTY_STATE, ...tableDefaultEmpty, ...column.empty }
```

Each field resolves independently, so a column that only sets `fillFontType`
keeps the system's `fillString` and `fillClassName` rather than blanking them.
The system default is `xxx-xxx` at `text-muted-foreground/15` — visible enough
to hold the shape, faint enough not to read as content.

### Step 6: the projection is pure

`buildFutureTable(options, prevSnapshot)` returns `{ instance, next }` and
touches nothing else — no React, no refs, no side effects. The snapshot goes in
as an argument and the new one comes back as a value.

Cells are built **eagerly** rather than behind a getter, specifically so `next`
is fully populated by the time the function returns. A lazy getter would mean
the snapshot depended on whether the view happened to read a cell, and a column
scrolled out of view would silently miss its own history.

### Why it works in one sentence

Key the DOM by position instead of by record, and "the data changed" stops being
a list being replaced and becomes a value changing inside a node that was
already there — which is the only reason it can flip instead of jump.
