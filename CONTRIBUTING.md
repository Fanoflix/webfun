# Contributing

Thanks for looking. webfun is a personal collection of small interactive web
experiments, so it has a narrower scope than most repos — worth reading the
next section before you spend time on a change.

## What I'm looking for

**Very welcome:**

- Bug fixes — something renders wrong, behaves wrong, or breaks on your device
- Typos and wording fixes, in the site copy or the explainer docs
- Accessibility fixes
- A demo that misbehaves in a browser I don't have

**Open an issue first, please:**

- New tools. Every tool is a designed thing with an explainer doc, and I'd
  rather talk about the idea than have you build something I then decline.
- Refactors, dependency swaps, or reformatting across files
- Anything that changes the look of the site as a whole

**Probably not:**

- Adding a framework, state library, or build tool
- Broad rewrites of code that already works

Declining a PR isn't a judgement on the code — it usually just means the change
points somewhere I don't want the site to go. Opening an issue first saves us
both the effort.

## Getting set up

Requires Node 22+ and Yarn 4 (via corepack — don't install Yarn globally).

```bash
corepack enable
yarn install
yarn dev          # http://localhost:3005
```

## Before you open a PR

Run the same four checks CI runs:

```bash
yarn typecheck
yarn lint
yarn check        # prettier, --check only; `yarn format` fixes
yarn test
```

CI runs all of them plus a production build on every pull request. A red run
means I won't have looked at it yet, not that it's rejected.

## House style

Most of it is enforced by Prettier and ESLint, so just run the checks. Two
things they can't enforce:

- **Comments explain _why_, not _what_.** The code says what it does; the
  comment exists for the decision a future reader can't recover.
- **Components are view-only.** Logic lives in a `use*` hook next to them.

`AGENTS.md` in the repo root is the long version — architecture, the anatomy of
a tool, and the five touchpoints needed to register a new one. It's written for
coding agents but it's the most accurate map of the codebase either of us has.

## Commit and PR conventions

- Branch off `main`; `main` requires a pull request.
- PR titles are lowercase and describe the change, e.g.
  `fix: dithering loupe drifts on zoom`.
- One concern per PR. A formatting sweep bundled with a fix is two PRs.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## Licence

By contributing you agree that your contributions are licensed under the
[Apache License 2.0](LICENSE), the same licence as the project.
