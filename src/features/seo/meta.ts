/**
 * Page metadata — what a link to this site turns into when someone pastes it.
 *
 * The site is shared far more often than it is browsed to, so an unfurl is the
 * real front door. Three things decide whether it lands:
 *
 * 1. **An image.** Without `og:image` LinkedIn renders a text-only card, which
 *    reads as a bare link and gets scrolled past.
 * 2. **`summary_large_image`.** The default `summary` card is a small square
 *    thumbnail beside the text; the large card is the wide one people actually
 *    look at.
 * 3. **Per-page copy.** Six posts unfurling with the same title and blurb reads
 *    as spam by the third one, so every tool carries its own.
 *
 * Absolute URLs throughout: crawlers do not resolve relative paths, and the
 * site lives under a `/webfun/` base path, so a bare `/og.png` would resolve
 * against the domain root and 404.
 */

export const SITE_URL = "https://fanoflix.github.io/webfun"
export const SITE_NAME = "webfun"

export const SITE_TITLE = "webfun — web stuff, no impact, just satisfying"
export const SITE_DESCRIPTION =
  "Small interactive experiments in graphics, motion and speculative UI. Things that looked cool enough to rebuild."

/** 1200×630 — the size every unfurl crops to. */
export const OG_IMAGE = `${SITE_URL}/og.png`
export const OG_IMAGE_WIDTH = "1200"
export const OG_IMAGE_HEIGHT = "630"

type Meta = Record<string, string>

export type PageMetaOptions = {
  /** Shown in the tab and as the unfurl headline. Suffixed with the site name. */
  title: string
  /** The unfurl's body copy. Two lines at most — LinkedIn truncates hard. */
  description: string
  /** Route path, e.g. `/dithering`. Omit for the home page. */
  path?: string
  /** Alt text for the card image. */
  imageAlt?: string
}

/**
 * Build the `meta` array for a route's `head()`.
 *
 * `og:title` deliberately carries the *bare* tool name while `<title>` gets the
 * site suffix: the tab needs to say which site it is, but an unfurl already
 * shows the site name on its own line and repeating it just eats the headline.
 */
export function pageMeta({
  title,
  description,
  path = "",
  imageAlt,
}: PageMetaOptions): Meta[] {
  const url = `${SITE_URL}${path}`
  const documentTitle = path ? `${title} — ${SITE_NAME}` : title

  return [
    { title: documentTitle },
    { name: "description", content: description },

    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: OG_IMAGE },
    { property: "og:image:width", content: OG_IMAGE_WIDTH },
    { property: "og:image:height", content: OG_IMAGE_HEIGHT },
    { property: "og:image:alt", content: imageAlt ?? title },

    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: OG_IMAGE },
    { name: "twitter:image:alt", content: imageAlt ?? title },
  ]
}
