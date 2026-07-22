import { gifUrl, imageUrl } from "../engine/assets"
import { isJumboEmoji } from "../engine/text"
import type { Segment } from "../engine/types"

/**
 * Renders one piece of a message body. A total switch on `kind`, so adding a
 * segment type is a compile error here — which is exactly where it should be.
 *
 * In v1 this component doesn't change. A timeline message reaches it one segment
 * at a time instead of all at once; what a segment *looks like* is settled here
 * either way.
 */
export function SegmentView({ segment }: { segment: Segment }) {
  switch (segment.kind) {
    case "text":
      return <TextSegment text={segment.text} />
    case "image":
      return <MediaSegment src={imageUrl(segment.assetId)} />
    case "gif":
      return <MediaSegment src={gifUrl(segment.assetId)} isGif />
  }
}

/**
 * `whitespace-pre-wrap` is what makes Shift+Enter mean anything — newlines are
 * stored verbatim in the text and would otherwise collapse.
 */
function TextSegment({ text }: { text: string }) {
  const jumbo = isJumboEmoji(text)
  return (
    <p
      className={
        jumbo
          ? "text-4xl leading-tight"
          : "text-sm leading-relaxed whitespace-pre-wrap"
      }
    >
      {text}
    </p>
  )
}

/**
 * Media is capped rather than sized to the source: the bundled assets run up to
 * 10000px wide, and a chat message is not the place to find that out.
 */
function MediaSegment({ src, isGif = false }: { src: string; isGif?: boolean }) {
  return (
    <div className="relative max-w-sm border border-border">
      <img
        src={src}
        alt=""
        loading="lazy"
        className="block max-h-80 w-full object-cover"
      />
      {isGif && (
        <span className="absolute top-1 left-1 bg-background/80 px-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          gif
        </span>
      )}
    </div>
  )
}
