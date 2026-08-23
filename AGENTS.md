# AGENTS.md

Orientation for an agent picking up work in this repo. Read this before touching
anything; it is the fastest path from cold start to a correct first edit.

## What webfun is

A static site of small, self-contained interactive experiments — graphics
techniques, motion studies, speculative UI concepts. Each experiment is called a
**tool** (or **entry**), lives at its own route, and is written to be *understood*,
not just used: every tool ships an explainer doc alongside its code.

Tone of the site: playful, plain-spoken, no jargon in user-facing copy. The code
comments are the opposite — they explain *why* a decision was made, at length,
because the "why" is the thing a future reader can't recover.

Deployed as a static SPA to GitHub Pages under the `/webfun/` base path.

## Stack

| Thing | Choice |
|---|---|
| Framework | TanStack Start (React 19), SPA mode — prerendered shell, client router |
| Router | TanStack Router, **file-based**; `src/routeTree.gen.ts` is generated — never hand-edit |
| Build | Vite 8, `base` = `/webfun/` in prod (override with `VITE_BASE`) |
| Styling | Tailwind v4 (CSS-first config in `src/styles.css`), shadcn on Base UI |
| Animation | `motion` (Framer Motion v12) |
| Icons | `lucide-react` |
| Package manager | **Yarn 4 + PnP** (`.pnp.cjs` is committed) |
| Tests | Vitest; DOM tests opt in per file with `// @vitest-environment jsdom` |

Commands: `yarn dev` (port 3005), `yarn build`, `yarn test`, `yarn lint`,
`yarn typecheck`, `yarn format`.

Style: no semicolons, double quotes, 2-space indent, 80-column print width, ES5
trailing commas. `@/*` maps to `src/*`. TS is `strict` with `noUnusedLocals` and
`noUnusedParameters` — dead variables fail the typecheck, they aren't warnings.

## Directory map

```
src/
  routes/                  # one file per URL; each is ~5 lines, delegating to a feature
    __root.tsx             # <html> shell, meta/OG tags, favicon, devtools
    index.tsx              # home
    <slug>.tsx             # one per tool
  features/
    <category>/<slug>/     # the tools themselves — see "Anatomy of a tool"
    sidebar/               # nav data + sidebar UI + ⌘K search
    home/                  # home index cards
    flags/                 # staged-release gating
    theme/                 # dark/light toggle + no-flash init script
    motion/eases.ts        # shared easing curves
  components/
    ui/                    # shadcn primitives — generated, don't hand-restyle
    layout/                # AppLayout, ToolIntro/IntroLink
    floating-panels/       # FloatingPanels + Panel: the top-right control stack
    loupe/                 # reusable zoom-loupe (ZoomBox, ZoomSelection, useRegionDrag)
  lib/utils.ts             # `cn()`
  styles.css               # Tailwind import + the whole oklch theme token set
```

Tool categories that exist today (`features/<category>/`):

- **`canvas-stuff/`** — graphics techniques on a canvas: `dithering`,
  `anti-aliasing`, `low-res-video`
- **`motion/`** — animation studies: `character-flow`, `style-flow`
- **`speculative-ui/`** — invented interaction concepts: `future-table`,
  `concept-chat`

A genuinely new kind of entry may warrant a new category folder — but check with
the user first; the categories double as the sidebar's group labels.

## Anatomy of a tool

Two shapes, depending on size. Both obey the same law (below).

**Small/medium** — flat folder (`dithering`, `anti-aliasing`, `style-flow`):

```
features/canvas-stuff/dithering/
  Dither.tsx          # the page; view only
  useDither.ts        # all state, effects, pipeline wiring
  pipeline.ts         # pure logic, no React
  DitherCanvas.tsx    # view
  Controls.tsx        # view
  StatsPanel.tsx      # view
  how-it-works.md     # the explainer (required)
  short-demo.md       # the reel script
```

**Large** — three-layer split (`future-table`, `concept-chat`):

```
features/speculative-ui/future-table/
  engine/       # types, pure core logic, and the use* hooks that drive it
  components/   # view-only building blocks
  demo/         # the page component + its own hook + demo fixtures
```

Use the flat shape by default. Reach for `engine/components/demo` only when the
tool is a reusable *mechanism* with a demo wrapped around it — that split exists
so the mechanism can be read without the demo's noise.

## The one non-negotiable rule

**Components are view-only. All logic lives in a `use*` hook.**

`*.tsx` files contain JSX and presentational helpers — nothing else. Every piece
of state, every effect, every ref, every derived value, every event handler goes
in a hook the component consumes. The page component's body should read as
one destructure of its hook, then markup:

```tsx
export function FutureTableDemo() {
  const { table, pageIndex, hasData, load, clear, nextPage } = useFutureTableDemo()
  return ( /* markup only */ )
}
```

Co-locate logic-owned types with the hook, not the component.

Corollaries the user cares about, and will call out:

- **No unnecessary `useEffect`.** Derive during render; use `useMemo` for
  expensive derivations. Effects are for genuine outside-React synchronisation —
  canvas painting, rAF loops, timers, event listeners, media elements — and each
  one should be defensible in a sentence.
- **No overengineering.** No abstraction layer for a single caller, no options
  object for one option, no generic machinery that one tool uses.
- **Plan before building.** Agree the approach with the user first, then write.

## Registering a new tool (five touchpoints, all required)

1. **Feature folder** — `src/features/<category>/<slug>/`, per the anatomy above.
2. **Route** — `src/routes/<slug>.tsx`. Keep it trivial; the route file exists to
   point at a feature, nothing more:
   ```tsx
   import { createFileRoute } from "@tanstack/react-router"
   import { Thing } from "@/features/<category>/<slug>/Thing"

   export const Route = createFileRoute("/<slug>")({ component: Thing })
   ```
   `routeTree.gen.ts` regenerates itself when the dev server runs.
3. **Flag key** — add the slug to `ToolKey` *and* `ALL_TOOLS` in
   `src/features/flags/flags.ts`. The slug **is** the route path, minus the
   leading slash; that identity is what lets `toolFromPathname` work.
4. **Nav entry** — add to the right group in `src/features/sidebar/nav-items.ts`:
   `title`, `to`, `tool`, `icon` (lucide), `blurb` (the home-card teaser), and
   `keywords` (hidden search aliases — jargon and synonyms a person might type
   that don't appear in the title). `tool` is mandatory by design: a tool cannot
   join the nav without someone deciding when it goes public.
5. **`how-it-works.md`** — in the feature folder. Non-optional; see below.

Then also mention the new slug in `.env.example`'s valid-slugs comment.

## Release flags

`src/features/flags/flags.ts` runs a staged launch. `VITE_RELEASED` is a
comma-separated slug list of what's public; unset in dev means *everything* is
visible, unset in a production build means *nothing* is (fails closed on
purpose). `NEVER_RELEASED` pins tools to unlock-only forever. `/?key=<secret>`
unlocks everything for a browser and persists it; `/?lock=1` clears it.

This is obscurity, not security — every tool ships in the JS bundle regardless.
It only controls what is listed and reachable.

## how-it-works.md — the format

Every tool has one, and it is a deliverable, not an afterthought: the point of
the site is that a reader comes away understanding the technique. Ground it in
*this tool's actual code and constants*, never a generic textbook version, and
link to the source file the math lives in.

Two parts:

1. **The detail** — open with a terms glossary in `` `X` = "plain explanation" ``
   form, written so a non-expert can follow it. Then the real formulas, written
   using those terms. Close with a one-sentence "why it works."
2. **The reel** — a ~20-second, hook-first Instagram-reel script with on-screen
   beats, built to travel. (Some tools keep this in a separate `short-demo.md`.)

See `features/canvas-stuff/dithering/how-it-works.md` for the reference example.

## Reuse before you build

Check these first — rebuilding one of them is the most common wasted work:

- `ToolIntro` / `IntroLink` (`components/layout/ToolIntro.tsx`) — the title +
  blurb every tool page opens with. `children` is a node so blurbs can link out.
- `FloatingPanels` / `Panel` (`components/floating-panels/`) — the fixed
  top-right stack of control windows, collapsible as a unit.
- `components/loupe/*` — shared zoom-loupe. The *magnification logic* stays in
  each feature's own hook; only the view pieces are shared.
- `features/motion/eases.ts` — shared easing curves.
- `components/ui/*` — shadcn primitives. Add new ones with the shadcn CLI rather
  than hand-writing them.

## Conventions worth absorbing

- **Comments explain why, not what.** Match the density of the surrounding file —
  it is high, and deliberately so. A non-obvious layout hack, a fails-closed
  default, a rejected alternative: all worth a paragraph.
- **Copy voice.** User-facing strings are conversational and concrete ("Screens
  are made of squares. Nothing in a game is."). No marketing register, no
  exclamation marks.
- **Theme.** Colours come from the oklch token set in `styles.css` via Tailwind
  classes (`bg-background`, `text-muted-foreground`, `border-border`). Never
  hard-code a hex. Dark is the default; the toggle adds `.dark` to `<html>` and
  `themeInitScript` prevents a flash.
- **Public assets** must go through the base path — see the `asset()` helper in
  `__root.tsx`. A bare `/foo.svg` 404s in production.
- **Don't auto-commit.** Finish the work, verify it, report — and leave the tree
  dirty. Commit only when explicitly asked.

## Before you call it done

```
yarn typecheck && yarn lint && yarn test
```

Then check it in the browser at `yarn dev` — these are visual tools, and a
passing typecheck says nothing about whether the thing looks right.
