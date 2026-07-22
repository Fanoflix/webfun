/**
 * The bundled media a message can reference.
 *
 * Files live in `public/chat-assets/` and are served verbatim. The manifests are
 * written by hand rather than globbed, which buys two things: every id is part of
 * the type system (so `Segment` can only point at media that exists), and a typo
 * is a compile error instead of a broken image at runtime.
 *
 * Ids are persisted inside chat history, so they must stay stable — renaming a
 * file orphans any message referencing it.
 */

/**
 * `public/` is served from the site root, which is `/` in dev but `/webfun/` in
 * production. `BASE_URL` carries whichever is in play, so paths are built from it
 * rather than hardcoded — the single reason this module exists at all.
 */
function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/+$/, "")}/chat-assets/${path}`
}

/**
 * Static images, keyed by filename stem. Add an entry per file dropped into
 * `public/chat-assets/images/`.
 */
export const IMAGES = {
  teldrassil: "teldrassil-burning.jpg",
  arthas: "arthas-arthas-menethil-wow.jpg",
} as const satisfies Record<string, string>

/**
 * Animated gifs, keyed by filename stem. Add an entry per file dropped into
 * `public/chat-assets/gifs/`.
 *
 * ⚠️ These are uncompressed and heavy (2MB, 2MB, 11MB). Fine for now by decision;
 * converting them to looping muted mp4 would cut ~95% off and only needs the
 * renderer to switch `<img>` for `<video>`.
 */
export const GIFS = {
  lich: "lk-gif-1.gif",
  frostmourne: "lk-gif-2.gif",
  arise: "lk-gif-3.gif",
} as const satisfies Record<string, string>

/**
 * Ids of registered media. Both are `never` until files are registered above —
 * which is the intended behaviour, not a gap: until then, no message can claim to
 * hold an image.
 */
export type ImageId = keyof typeof IMAGES
export type GifId = keyof typeof GIFS

/**
 * `Object.keys` is typed `string[]` — soundly, since a value can carry keys its
 * type doesn't declare. These manifests are `as const` literals that never leave
 * this module unwidened, so their keys really are exactly known.
 *
 * Narrowing happens through the declared return type rather than a cast, so no
 * caller has to write `as ImageId[]` at each use site.
 */
function manifestIds<T extends Record<string, string>>(manifest: T): (keyof T)[] {
  return Object.keys(manifest)
}

export const IMAGE_IDS: ImageId[] = manifestIds(IMAGES)
export const GIF_IDS: GifId[] = manifestIds(GIFS)

/**
 * Portraits for the two participants. Both are required for the thread to render.
 * The keys are the code's names for the participants; the values are whatever the
 * files on disk are actually called, which is the whole point of a manifest.
 */
export const AVATARS = {
  viewer: "avatars/visitor.png",
  chatter: "avatars/chatter.webp",
} as const satisfies Record<string, string>

export type AvatarId = keyof typeof AVATARS

export function imageUrl(id: ImageId): string {
  return assetUrl(`images/${IMAGES[id]}`)
}

export function gifUrl(id: GifId): string {
  return assetUrl(`gifs/${GIFS[id]}`)
}

export function avatarUrl(id: AvatarId): string {
  return assetUrl(AVATARS[id])
}
