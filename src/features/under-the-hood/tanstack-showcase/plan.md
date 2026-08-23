# TanStack showcase — plan

Status: **Phase 1 built + UI pass (2026-08-23).** Phase 2 (Architecture mode) is next.

## The idea

One small app, implemented three times over the same UI, instrumented so that
the normally-invisible parts of a data layer — cache entries, stale timers,
optimistic writes, sync queues — are visible while you use it.

Three surfaces render the same event stream:

| Surface | Shows |
|---|---|
| **App** | The product UI, with hint bubbles as things happen |
| **Architecture** | Nodes and edges: query cache, DB collection, sync engine, server |
| **Code** | The running rung's real source, with the active line highlighted |

A **timeline sidebar** is always visible alongside all three, showing the ordered
flow of events for the last interaction.

## Decisions taken

1. **Real libraries, not simulated.** Real `@tanstack/react-query`, real
   `@tanstack/react-db`, against a fake in-memory server. A simulation would
   teach a fiction, and the point of this entry is to be true.
2. **Ladder, not toggles.** Three rungs, not 2ⁿ combinations.
3. **App domain: issue/ticket tracker.** Familiar enough that no explanation is
   spent on the domain itself.
4. **Layout: mode toggle (App / Arch / Code) with a persistent timeline.** Only
   the active mode animates.
5. **Code impact = the live source panel only.** No runtime counters, no diff view.
6. **Teammate is button-triggered**, never ambient — every flow stays clean and
   attributable, and filming is reproducible.
7. **Deps pinned exactly, never `latest`.** Floating `@tanstack/*` pins under
   Yarn PnP are what caused this project's unresolved-import overlay before.

## Layout and look

Full-bleed, capped at `2240px` and centred beyond that. The app sits left as its
own window — its own header, inbox column and detail pane — so it reads as a
product rather than blurring into the teaching apparatus. The timeline sits
right, where devtools live.

The site's sidebar *floats over* content instead of pushing it, which every
other tool gets away with because they're centred and narrow. This page reserves
the rail's track itself (`railOffset`) or the app window hides underneath it.

Shared class strings live in `styles.ts`; anything used twice goes there or
becomes a component (`TicketMeta.tsx`), never a retyped string.

The timeline is modelled on Chrome's Network panel — Name / Status / Time, with
the waterfall as a hairline under each row rather than a fourth column, so the
narrow panel stays readable. Chrome's literal palette is used for it (the
orange TTFB bar, the red failure) because the recognition *is* the point; those
colours appear nowhere else in webfun. Only the waiting phase is drawn: the fake
server has no transfer phase, and a green "download" segment would be a number
we don't have.

Local events nest under the request they belong to, correlated by an explicit
`trace` (a query key, or the endpoint) rather than by ordering — with jitter on,
responses land out of order and an ordering heuristic would mis-attribute them.
Events with no request of their own get a Chrome-style pseudo-status:
`(from cache)`, `(invalidated)`.

## The ladder

Each rung is a real implementation of the data layer behind an identical UI. All
satisfy one `contract.ts`, so the UI is written once; the differences show up in
behaviour and in source, not in signatures.

| Rung | Implementation | What it fixes |
|---|---|---|
| 0 | `useState` + raw `fetch` | — spinner every navigation, refetch every mount, duplicate in-flight requests, hand-rolled loading/error flags, write = wait |
| 1 | + TanStack Query | cache hit paints instantly, request dedupe, stale-while-revalidate, invalidation cascade |
| 2 | + TanStack DB | local collection, live queries, writes land instantly, rollback on failure, teammate's edit arrives without a refetch |

TanStack **Form** and **Table** are always on and sit outside the ladder — they
are UI ergonomics, not data layer, and mixing the two axes muddies the story.
They still emit their own hint bubbles.

## The keystone: one event stream, three renderers

The thing that stops this becoming three codebases. Every meaningful moment
emits one typed event:

```
query:fetch:start · query:cache:hit · query:cache:write · query:stale
query:invalidate  · db:optimistic:apply · db:optimistic:rollback
sync:enqueue · sync:push · sync:ack · server:receive · server:respond
```

Events come from **real instrumentation** — the query cache subscription, the DB
collection subscription, the fake server — not from `emit()` calls sprinkled
through the UI. App mode renders the latest as a bubble, Architecture renders
accumulated state, Code highlights a line, Timeline lists them in order.

**Flows.** A user interaction opens a flow; every event until quiescence attaches
to it; the next interaction opens a fresh one. The timeline's "reset and
repopulate" behaviour falls out of this model rather than being special-cased.

**Tempo.** The fake server's latency dial is the slow-motion control. Raising
latency genuinely slows the system down — no fake clock, no fighting the real
timers inside Query.

## The fake server

In-memory, with knobs for **latency**, **jitter**, and **failure rate**. The
failure rate is not optional: optimistic *rollback* is the most dramatic moment
in the whole piece, and it can't be staged without failures.

## The code panel

- **Source loaded via Vite `?raw`**, so the panel shows the exact file that is
  running. No transcribed copy that can drift.
- **Event→line mapping via marker comments** (`// @beat query:cache:hit`) parsed
  out of the raw text at load time. Robust to edits, self-documenting in the real
  file; events with no marker just don't highlight. Hard-coded line numbers would
  rot on the first edit.
- **Syntax highlighting**: small hand-written TS tokenizer, not Shiki. Shiki is
  the more correct answer but is a heavy dependency for one panel in one entry.

## Structure

```
features/under-the-hood/tanstack-showcase/
  engine/
    types.ts            events, node ids, flow types
    events.ts           pure event bus + flow grouping
    useEventStream.ts   subscription, current flow, history
    server.ts           fake API: latency, jitter, failure
    useTeammate.ts      the button-triggered second actor
    rungs.ts            ladder definition + metadata
  rungs/
    contract.ts         the shared shape every rung satisfies
    rung0-naive/useTickets.ts
    rung1-query/useTickets.ts
    rung2-db/useTickets.ts
  app/            TicketList · TicketDetail · Composer · HintBubble
  architecture/   ArchitectureView · QueryCacheNode · DbNode · SyncNode
                  ServerNode · Packet · useArchitectureLayout
  code/           CodePanel · useCodePanel · tokenize.ts · markers.ts
  timeline/       TimelinePanel · useTimeline
  demo/           TanstackShowcase · useTanstackShowcase
  how-it-works.md · short-demo.md
```

New category `under-the-hood/`, sidebar group label **"Under the hood"** — the
existing groups (Before/After, Recreations, Motion, Speculative UI) don't fit an
entry whose subject is a library's internals.

Animation: `motion` packets travelling SVG edge paths, reusing
`features/motion/eases.ts`. Query-cache nodes are cards per query key with a
state chip and a staleness countdown ring, driven by the real timers.

## Phases

- **Phase 0 — spike (GATE). ✅ PASSED.** The Electric risk was smaller than
  feared. Electric ships as a *separate* package (`@tanstack/electric-db-collection`)
  and core `@tanstack/db` contains no reference to it; the `SyncConfig` interface
  (`begin`/`write`/`commit`/`markReady`/`markError`/`truncate`) is public, so any
  source can back a collection.

  We take `queryCollectionOptions` from `@tanstack/query-db-collection@1.2.7` —
  the path a Query user would actually take, and a perfect fit for the ladder,
  since rung 2 *keeps* rung 1's Query and layers the store on top. It accepts a
  `queryClient` + `queryKey` + `queryFn` plus `staleTime`/`gcTime`, and
  `onInsert`/`onUpdate`/`onDelete` for the write path — so every moment we want to
  visualise is a hook we own.

  `engine/phase0-spike.test.ts` proves the three load-bearing behaviours:
  Query-backed sync into a collection, a live query updating with no refetch, and
  an optimistic insert rolling back automatically when the server rejects. Keep
  it as a regression test against `0.x` bumps.
- **Phase 1. ✅ BUILT.** Fake server + event bus + rungs 0/1 + App mode +
  Timeline, live at `/tanstack-showcase` under a new "Under the hood" nav group.
  `rungs/rungs.test.tsx` pins the behaviours the ladder claims.

  Two findings worth keeping:

  1. **The app runs inside `<StrictMode>`** — TanStack Start's default client
     entry (`@tanstack/react-start/dist/plugin/default-entry/client.tsx`) adds
     it, not our code. In dev that double-invokes effects, so **rung 0 fires its
     list fetch twice** and the timeline shows two requests. It is StrictMode
     doing its job (surfacing a non-resilient effect) and does *not* happen in a
     production build. Rung 1 shows one request because Query deduplicates
     concurrent identical fetches. Decide before filming whether to show, label,
     or suppress this.
  2. **`observerAdded` alone does not mean "no request".** Reporting every
     observer-with-data as a cache hit was wrong: outside the stale window Query
     paints the cached value *and* refetches behind it, so the timeline promised
     a free read and then showed the request. Now split into `query:cache:hit`
     (fresh, nothing requested) and `query:cache:stale` (served, revalidating).
- **Phase 2.** Architecture mode, wired to the same stream.
- **Phase 3.** Rung 2, optimistic rollback, teammate actor.
- **Phase 4.** Code panel, `how-it-works.md`, reel script.

## Assumptions

1. No real backend — the site is static on GitHub Pages.
2. Ships behind the existing flag system; unlock-only until ready.
3. Desktop-first. Three surfaces plus a timeline will not fit a phone; mobile
   gets a reduced layout, not the full thing.
4. Logic in hooks, views dumb — including the architecture diagram, whose layout
   math lives in `useArchitectureLayout`.
5. `how-it-works.md` goes deeper than other entries: real cache-lifecycle
   mechanics, because this doubles as article research.

## Risks

- **TanStack DB is 0.x** — the main one, which is why Phase 0 gates everything.
- **Scope**: 4–6× a normal entry. Phase 1 is drawn to stand alone for this reason.
- **Visual busyness**: three animated surfaces on one stream. Mitigated by only
  animating the active mode.
