# Concept chat assets

Drop files here. Everything in `public/` is copied to the site root verbatim, so a
file at `public/chat-assets/gifs/shrug.gif` is served at `/chat-assets/gifs/shrug.gif`
in dev and `/webfun/chat-assets/gifs/shrug.gif` in production.

**Never hardcode those paths.** The `/webfun/` prefix only exists in production
builds. Reference assets through the manifest in
`src/features/speculative-ui/concept-chat/engine/assets.ts`, which prepends
`import.meta.env.BASE_URL` for you.

## Folders

| Folder | What goes in it | Used for |
|---|---|---|
| `images/` | Static images — png, jpg, webp | The `+` → image picker |
| `gifs/` | Animated gifs | The `+` → gif picker |
| `avatars/` | Square-ish portraits, ≥128px | The visitor and the fake chatter |

## Naming

Lowercase, hyphenated, descriptive: `dog-typing.gif`, `sunset.webp`, `nova.png`.
The filename stem becomes the asset id, so it must be unique **within its folder**
and stable — ids are written into persisted chat history, and renaming a file
orphans any message referencing it.

## Sizing

Keep them small; they ship in the repo and are served from GitHub Pages.

- Images / gifs: **under ~500KB each**, max edge ~800px. A dozen or so is plenty.
- Avatars: **under ~50KB**, 128–256px square. Two needed — one for the visitor,
  one for the fake chatter.

## After dropping files in

Tell me and I'll register them in `engine/assets.ts`. The manifest is explicit
rather than glob-based so that every id is typed and a missing file is a
compile-time error instead of a broken image at runtime.

## Note on the folder name

Deliberately not `public/concept-chat/` — that would shadow the `/concept-chat`
route path on GitHub Pages, where these files are served by the same static host
that handles routing.
