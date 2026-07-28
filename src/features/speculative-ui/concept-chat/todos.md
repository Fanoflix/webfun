# Concept chat

Speculative UI. Category: **Speculative UI** (alongside Concept table 1).
Route `/concept-chat` · `ToolKey` `"concept-chat"` · **permanently flagged** — never
enters `VITE_RELEASED`, reachable only via the unlock key.

---

## The idea

**Status quo:** a message is a bag of content — text, images, gifs, emoji — and it
all lands at once.

**The concept:** a message that is *meant to be read a certain way*. It arrives with
a play button. You press it, and the message performs itself on a timeline — a line
of text for two seconds, then it fades, then a gif, then the punchline. People fake
this today by rendering a video. It should just be a message.

**v0 (this document) builds only the status quo half** — but every type decision here
is made so the timeline half is an addition, not a rewrite.

---

## The load-bearing decision

A message body is an **ordered `Segment[]`**, never a string.

```ts
type Segment =
  | { kind: "text";  text: string }
  | { kind: "image"; assetId: AssetId }
  | { kind: "gif";   assetId: AssetId }
```

v0 renders every segment at once. v1 attaches `timing` to segments and adds
`mode: "static" | "timeline"` to the message. **Same segment types, same renderer** —
the timeline version walks a clock instead of emitting everything immediately. See
[v1 — timeline messages](#v1--timeline-messages).

The trap being avoided: storing `content: string` + `attachments[]` the way real chat
apps do, then needing a second parallel representation for timed messages.

---

## v0 scope — message creation

What a person can compose, end to end:

- **Plain text.** No markdown. No `**bold**`, no backticks, no code blocks, no
  spoilers. Deliberately dropped — the concept is timing, not formatting.
- **Newlines** via `Shift+Enter`. `Enter` sends.
- **Emoji**, from a picker — a curated grid, no search, zero dependencies. Rendered
  as plain unicode.
- **Jumbo emoji** — a message whose text is only emoji renders large.
- **Images and gifs**, chosen from a bundled set via the `+` button. **No uploads** —
  the thread is persisted, and persisting user blobs is out of scope. (If the idea
  goes anywhere it gets its own site where people upload their own.)
- A message may carry text and attachments together.
- Empty messages are not sendable.

### Composer

Discord-shaped, single bar:

- `+` on the left → attach panel (image / gif from the bundled set).
- Textarea in the middle, grows with content up to **`max-h-44`**, then scrolls.
- Emoji button on the right.
- No send button — `Enter` sends.

### Message list

- **Grouping** — consecutive messages from the same author collapse under one
  header (avatar + name + timestamp). 5-minute window.
- **Avatars** — round. The only round thing in the module; everything else is square
  by the project's no-roundedness rule.
- **Timestamp** — to the right of the name on a group header. Relative throughout.
- **Date divider** — `———— Today ————`. Rule + label, no badge, no chrome. The one
  divider in the module.
- **Reactions** — toggleable and counted. Never seeded; every reaction animates in.
  Added via the same picker the composer uses.
- **Density** — Slack-style grouping at compact spacing. To be iterated on later.

### Layout

- The whole app sits in a container that takes the **full available width and
  height** of the tool page.
- Left sidebar: a **single conversation entry** at the top; at the bottom, below a
  divider, the visitor's own avatar + username — and the **kill switch** beside it.
- Center: the thread. No right sidebar.
- Responsive, desktop-first. On small screens the composer gains a **send button**,
  since `Enter`-to-send has no mobile equivalent.

### The fake chatter

One counterpart, and **obviously** scripted — no pretending to be clever.

The thread is seeded with a conversation from them, ending on the message that shows
off the full concept. In v0 that message is static; in v1 it becomes the timeline
showcase.

Behaviour when you send:

- One reply, drawn at random from a pool of 3.
- Arrives **15s** after your message (`REPLY_DELAY`), typing indicator running for
  the tail of that wait.
- Throttled — a send while a reply is already pending doesn't queue a second one.
- **2s after that reply lands**, the fake chatter drops a reaction on *your* message
  (`REACT_DELAY`) — this is what shows off the reaction animation.

### Timestamps

Relative, and they stay relative: `Just now` (<60s) → `2m` → `1h` → `Yesterday`.
Driven by **one shared ticker** at the list level, never a timer per message.

### Reset

The kill switch doesn't restore the seed — it empties the thread and the
counterpart **types the opening conversation back in**, live:

| Line | Typing before it |
|---|---|
| 1 | 2s — a considered opener |
| 2–4 | 500ms each — rattling on |
| 5+ | 1.1s — back to a normal pace for the punchline |

Plus a ~280ms beat between a line landing and the next one starting.

### Lifetime

A conversation lives **10 minutes**, then discards itself and replays the seed.
It's a demo anyone can type into; it shouldn't hoard a stranger's half-finished
thoughts.

- The countdown is **shown in the rail**, not hidden — a demo that silently wipes
  itself reads as a bug. It turns red under a minute.
- A **restart button** beside it pushes expiry back to a full 10 minutes.
- Expiry is enforced **both** by a live timer and on read, so a tab reopened days
  later doesn't restore a stale thread before the timer can fire.
- The reset confirm offers **"Don't ask me again"** (persisted separately from the
  thread, so a schema bump doesn't lose it). It commits on confirm, not on tick —
  writing through immediately would tear the open dialog away mid-decision.

### Persistence

- Messages **persist** across reloads (localStorage).
- Stored under a schema version — a version bump wipes rather than crashes on old data.
- v1 note: a persisted timeline message **resets its playhead to 0 on reload**. The
  message survives; its performance restarts.

---

## Explicitly out of v0

Markdown · code blocks · spoilers · view-once · replies/quotes · edited badges ·
delivery ticks · link previews · threads · keyboard navigation (⌘K, j/k) · uploads ·
multiple conversations.

---

## Animations

Nothing animates without signoff. Approved set:

Every one uses **expo out**, defined once as `CHAT_EASE` in `engine/defaults.ts`.

| # | What | Spec |
|---|---|---|
| 1 | **Message enter** | Slides in from the bottom, pushing the thread up (height 0 → auto). **0.25s.** No fade. Only messages newer than load animate. |
| 2 | **Typing indicator** | Three dots, one lit at a time travelling left to right. Snappy, not a pulse. |
| 3 | **Composer height** | Grows with content to `max-h-44`. **0.15s.** Bottom edge pinned. |
| 4 | **Reaction enter** | Slides out from the left: width 0 → intrinsic, transform origin center-left. **0.2s.** |

Reduced motion: everything resolves to its end state immediately.

---

## Architecture

Follows `future-table/`'s split. All logic in hooks and pure modules; components are
view-only.

```
concept-chat/
  todos.md
  engine/
    types.ts       Author, Segment, Message, Reaction, AssetId
    defaults.ts
    seed.ts        the seeded thread + fake-chatter script
    storage.ts     load/save, schema version
    grouping.ts    messages → groups + date dividers (pure)
    time.ts        "Just now" / clock formatting (pure)
    useChat.ts     thread state, send, react, reset
    useComposer.ts draft, attachments, submit
    useFakeChatter.ts
    useStickToBottom.ts
  components/
    ChatFrame.tsx  ChatSidebar.tsx  MessageList.tsx  MessageGroup.tsx
    MessageRow.tsx SegmentView.tsx  Reactions.tsx    Composer.tsx
    AttachPanel.tsx EmojiPicker.tsx TypingIndicator.tsx DateDivider.tsx
  assets/          bundled images + gifs
  demo/
    ConceptChatDemo.tsx
```

---

## Implementation notes

Three decisions that keep the module clean, made up front:

- **Persistence writes on action, not in an effect.** Every mutation goes through one
  wrapper in `useChat` that updates state and saves. No save-on-change effect.
- **Relative timestamps use one shared ticker.** A single interval at the list level
  publishes "now"; each row derives its label. Not a timer per message.
- **Effects are budgeted and each one is justified:** the shared ticker, the fake
  chatter's timers, one layout effect for stick-to-bottom scroll, the expiry timer,
  and — in v1 — unmount cleanup on a *playing* timeline message. Nothing else. Five
  total, and the numbering in the source is kept honest.

Stick-to-bottom: track "is near bottom" on scroll, and in a layout effect pin to the
bottom only when that holds — so a new message never yanks someone reading history.

---

# v1 — timeline messages

The half the whole v0 model was shaped for. **Beats, not a timeline.**

## The mental model

A timeline message is a **sequence of beats** played top to bottom. A beat appears,
holds, then the next one lands **on a new line beneath it** — nothing is replaced,
nothing disappears. When it finishes, the whole message is sitting there in full,
readable like any other message.

This is deliberately *not* a video editor. No ruler, no absolute timestamps, no
draggable clips, no overlapping lanes. The author never sees a millisecond.

Two things fall out of accumulating rather than replacing:

- **Nothing can overlap**, so there are no layers to reason about. Arrival order is
  the entire model.
- **The performance is the thread growing** — which is animation #1, already built
  and already approved.

## Data model — additive, no migration

`hold` on a segment means *"this segment starts a new beat, and waits this long
before the next beat lands."* A segment **without** timing joins the beat before it —
which is precisely v0's "show immediately and keep showing".

```ts
type BeatEnter = keyof typeof BEAT_ENTERS      // "fade" today

type Timing = { hold: number; enter: BeatEnter }

type Segment =
  | { kind: "text";  text: string;     timing?: Timing }
  | { kind: "image"; assetId: ImageId; timing?: Timing }
  | { kind: "gif";   assetId: GifId;   timing?: Timing }

type Message = {
  …
  mode?: "static" | "timeline"   // absent ⇒ static
  played?: boolean
}
```

Consequences, all of them the point:

- A **static message has no timing on any segment** → one beat → renders all at once.
  Every v0 message already in localStorage stays valid and renders identically.
  **No schema bump, no wipe.**
- A beat can hold **text and media together** — text segment carries the timing, the
  gif after it doesn't.
- **Beats are derived, never stored.** `toBeats(body): Beat[]` is a pure projection in
  the engine, unit-tested, same shape as `grouping.ts`. The view never groups.
- The **last beat's `hold` is ignored** — nothing follows it. The composer doesn't
  offer one.
- **`played` is persisted on the message.** A message watched to the end comes back
  finished after a reload rather than demanding to be watched again — and because it
  lives on the thread, resetting the demo clears it with everything else. Mid-play
  position is *not* stored: a reload lands you either at the poster or at the end,
  never halfway.

`BEAT_ENTERS` is a **registry** of motion variants keyed by id (the `manifestIds`
trick from `assets.ts` gives the union for free). v1 ships `fade` only; adding
`slide` or `scale` later is one entry and touches no renderer.

## Composing — the composer expands

The regular composer *becomes* the timeline composer. A toggle in the bar (beside
`+`) grows it upward over the thread — same bar, more of it. Not a modal, not a
route, and the sidebar stays.

```
┌────────────────────────────────────────────────────────┐
│ TIMELINE  beat 2 of 4 · 0:06     ‹ › 🗑  ▶ Preview  ✕   │
├────────────────────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐  ┌───┐                    │
│  │1 ok│ │2 so│ │3 🎞│ │4 …│  │ + │                     │  ← filmstrip
│  ├────┤ ├────┤ ├────┤ ├────┤  └───┘                    │
│  │N 1.5s│Q 0.8s│L  3s│ end │                           │
│  └────┘ └────┘ └────┘ └────┘                           │
├────────────────────────────────────────────────────────┤
│  [+] [▶] Beat 2 — Enter for the next     [emoji] [send]│  ← the existing bar
└────────────────────────────────────────────────────────┘
```

**There is only one editor.** The selected beat *is* the composer bar's draft — its
text, its attachments, its emoji picker, its `+`. Beats are stored beside it and
selecting one swaps it in. That's what makes text-plus-media beats free and keeps
the composer's behaviour from being written twice. There is no second text box and
no separate stage; the bar you already type into is the stage.

The swap is an **explicit action, never a synchronising effect**: anything that
changes the selection first writes the live draft back into the beat it's leaving,
then loads the one it's arriving at.

- **Enter starts the next beat** rather than sending. It's the same gesture someone
  already makes hammering a thought out across three messages, and it's the thing
  that keeps this from feeling like editing software. Sending is the send button,
  which timeline mode shows on every screen size.
- **Filmstrip** — one evenly-sized card per beat. Evenly sized on purpose: it reads
  as a *sequence*, not a duration ruler. Widths that encode duration would make this
  the video timeline the whole idea exists to avoid. Scrolls horizontally; **no cap
  on beats**.
- **Hold** is a chip on each card that cycles the presets, showing the label *and*
  the real number — `Normal 1.5s`. Presets live in `defaults.ts` as an array and
  `hold` is a plain number, so a custom-duration input later needs nothing from the
  model. The **last card shows `end`** and is disabled: nothing follows it.
- **Reorder and delete live in the header**, acting on the selection, rather than as
  six controls on every card. Selection follows the beat when it moves, not the slot.
- **`▶ Preview`** renders the draft through the *real* `TimelineMessage` — play
  button and all — so what's checked is exactly what arrives. Keyed, so each press
  starts over.
- Deleting the last beat leaves timeline mode. So does `✕`, which keeps the selected
  beat as the plain draft — the composer collapsing to one beat is the plain
  composer.

## In the thread

```
   received                     playing                    rested
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ ok so hear me out    │   │ ok so hear me out    │   │ ok so hear me out    │
│                      │   │                      │   │                      │
│      ▶  0:08         │   │ [gif]                │   │ [gif]                │
└──────────────────────┘   └──────────────────────┘   │                      │
                                   ↓ grows            │ record a video? insane│
                                                      └──────────────────────┘
                                                              ↺ replay (hover)
```

- **Poster** = beat 1, already rendered, with `▶ this message is playable` and the
  run time beneath it. Beat 1 being visible means pressing play *continues* rather
  than restarting — no flash, no jump. It says what it is in words because a play
  button on a *message* is the one thing here nobody has seen before, and a visitor
  who doesn't press it never finds out what any of this was for.
- **Hovering a message tints the row**, full width of the thread. In a run of
  messages from one author there are no dividers and no repeated avatar, so this is
  the only thing that says where one message ends and the next begins.
- **Click-only.** Nothing autoplays. Opting in is the anticipation.
- **Playing** = each beat lands on its own line, pushing the message (and the thread)
  down. Animation #1, unchanged, plus the beat's `enter`.
- **Rested** = the entire message visible, start to finish, forever. `↺ Replay` sits
  under it, always visible — a performance you can't obviously watch again is one
  you only half-watched the first time. Replay clears back to the poster and runs.
- **Reactions** attach to the message as a whole, below the card. Unchanged.

## Playback

`useTimelinePlayback(beats)` → `{ visibleCount, phase, play, replay }`. A chain of
timeouts over an owned `timers` ref with one `clearAll` — the same discipline as
`useFakeChatter`, and the same shape to test. An idle message runs no timers.

- **Effect budget goes 4 → 5.** The fifth is unmount cleanup on a *playing* message
  only, and it exists for the same reason the chatter's does: timers must not outlive
  the component.
- **Scroll**: a landing beat isn't a message change, so `useStickToBottom` won't see
  it. Playback publishes a beat-landed tick that joins the deps — otherwise a message
  performs itself off the bottom of the screen.
- **Reduced motion**: a timeline message renders as the plain static stack — i.e.
  exactly the v0 renderer, fully readable, just not performed. Same fallback for SSR.

## The seed *is* the demo

**One message, three beats.** The seed used to be five messages of someone rattling
on — which is the shape a chat app forces on a single thought — plus a sixth that
demonstrated the idea. Both collapse into one timeline message carrying the same
words.

That makes the first impression the argument itself, in the form it's arguing for: a
thought that arrived whole and unfolds at the pace it was meant to be read at,
rather than a wall of text explaining that it could. Beats hold two lines each,
since untimed segments join the beat above.

A consequence worth knowing: the reset replay now types once and drops one message.
The burst pacing table (`replayTypingFor`) is kept for a seed that grows back into
several messages, but only its opener branch runs today.

## Deferred from v1

Custom hold input · additional `BEAT_ENTERS` (slide, scale) · per-beat exit
transitions · scrubbing · editing a sent timeline message.

---

## Tasks

**1 — Scaffold**
- [ ] `concept-chat` `ToolKey`, route, sidebar entry, `ToolIntro`, home blurb
- [ ] Full-width/height container inside the tool page

**2 — Engine (pure, unit-tested)** ✅ *done — 24 tests*
- [x] `types.ts` — `Segment`, `Message`, `Author`, `Reaction`, media ids
- [x] `assets.ts` — manifests + `BASE_URL`-aware url builders
- [x] `time.ts` — relative labels, day bucketing, ticker backoff
- [x] `grouping.ts` — messages → groups + date dividers
- [x] `storage.ts` — versioned load/save with full validation
- [x] `seed.ts` — seeded thread + reply pool
- [x] `defaults.ts` / `emoji.ts` — timings, authors, curated emoji
- [x] `useChat.ts` — send / append / react / reset

**3 — Static render** ✅
- [x] Frame, sidebar (conversation entry, avatar footer, kill switch w/ confirm)
- [x] Message list, groups, avatars, date divider, jumbo emoji
- [x] Assets registered — 2 images, 3 gifs, 2 avatars

**4 — Composer** ✅
- [x] Growing textarea, `Enter` / `Shift+Enter`, mobile send button
- [x] Attach panel, emoji picker

**5 — Interaction** ✅
- [x] `useChat` — append / react / reset
- [x] Reactions (toggle, count, own-vs-other)
- [x] Fake chatter + typing indicator
- [x] Stick-to-bottom

**6 — Motion & polish** ✅
- [x] Animations 1–4, reduced-motion fallbacks
- [ ] `how-it-works.md` (project convention)

**7 — v1 timeline messages** ✅ *done — 34 new tests, 123 total*
- [x] `types.ts` — `Timing`, `mode`, `played`; `beatEnters.ts` registry
- [x] `beats.ts` — pure `toBeats` / `flatten` / `totalDurationMs`, round-trip tested
- [x] `storage.ts` — validates `timing`, `mode`, `played`; no schema bump
- [x] `defaults.ts` — `HOLD_PRESETS`, `DEFAULT_HOLD_MS`, `DEFAULT_BEAT_ENTER`
- [x] `useTimelinePlayback.ts` — beats scheduled against one offset, replay
- [x] `TimelineMessage.tsx` — poster, play, accumulating beats, rest + replay
- [x] `useTimelineComposer.ts` — beats beside one editor, explicit draft swap
- [x] `TimelineComposer.tsx` — header + filmstrip, expands from the composer
- [x] Beat card: select, hold chips; reorder + delete in the header
- [x] `▶ Preview` through the real `TimelineMessage`
- [x] Stick-to-bottom joins the beat-landed tick
- [x] Seed collapsed to a single three-beat timeline message

**Deferred from 7**
- [ ] Drag-to-reorder in the filmstrip (arrows today).
- [ ] Custom hold input beside the presets.
- [ ] A `BeatCard` thumbnail instead of a media icon.

**Deferred**
- [ ] Compress media — 20MB total, `lk-gif-3.gif` alone is 11MB. Needs
      `brew install ffmpeg`; gif → looping muted mp4 cuts ~95%.
- [ ] `REPLY_DELAY_MS` is 15s. Likely too long once felt.
- [ ] Density pass — "Slack-ish but compact" is in, but was always going to be
      iterated on once visible.
```
