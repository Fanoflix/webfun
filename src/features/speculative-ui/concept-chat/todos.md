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

v0 renders every segment at once. v1 attaches timing (`at`, `hold`, `exit`) to each
segment and adds `mode: "static" | "timeline"` to the message. **Same segment types,
same renderer** — the timeline version walks a clock instead of emitting everything
immediately.

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
- **Effects are budgeted at three, all justified:** the shared ticker, the fake
  chatter's timers, and one layout effect for stick-to-bottom scroll. Nothing else.

Stick-to-bottom: track "is near bottom" on scroll, and in a layout effect pin to the
bottom only when that holds — so a new message never yanks someone reading history.

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

**Deferred**
- [ ] Compress media — 20MB total, `lk-gif-3.gif` alone is 11MB. Needs
      `brew install ffmpeg`; gif → looping muted mp4 cuts ~95%.
- [ ] `REPLY_DELAY_MS` is 15s. Likely too long once felt.
- [ ] Density pass — "Slack-ish but compact" is in, but was always going to be
      iterated on once visible.
```
