import markSvg from "../../../public/favicon.svg?raw"

/**
 * The site's mark, inlined from `public/favicon.svg` at build time.
 *
 * That file is the single source: the favicon and this component are the same
 * artwork, and keeping a second copy of the path data here meant every tweak was
 * two edits — which is exactly how the two ended up disagreeing.
 *
 * It's inlined rather than pointed at with an `<img>` because only inline SVG
 * inherits `currentColor`. The file has to guess the theme via
 * `prefers-color-scheme`, which is right for a browser tab strip and wrong here:
 * the app is dark by default and doesn't follow the OS at all.
 */

/**
 * That guess is exactly what has to go. The file's `<style>` pins `:root`, and
 * inlined into a page `:root` is the *document* — it would repaint the entire
 * app, not the icon. Stripped, the markup is left with nothing but
 * `currentColor`, which is what lets a class on the wrapper drive it.
 */
const INLINE_MARK = markSvg.replace(/<style[\s\S]*?<\/style>/g, "")

export function WebfunMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      // The svg carries its own `viewBox` but no size, so it's stretched to
      // whatever the wrapper is told to be.
      className={`inline-block [&>svg]:size-full ${className}`}
      // Not user input: a local file read at build time.
      dangerouslySetInnerHTML={{ __html: INLINE_MARK }}
    />
  )
}
