/**
 * Text inspection for the renderer. Pure, and deliberately small — the only
 * question the view needs answered is "should this render large?".
 */

/** Above this many emoji it's a sentence in emoji, not an exclamation. */
const JUMBO_MAX_LENGTH = 3

/**
 * Anything that makes a message *text* rather than pure emoji. Checked as an
 * exclusion rather than trying to enumerate what counts as an emoji — the emoji
 * ranges are a moving target, letters and digits are not.
 *
 * This is also why `\p{Emoji_Component}` isn't used to match: it includes the
 * ASCII digits and `#`/`*` (they form keycap sequences), so "123" would pass as
 * emoji-only.
 */
const TEXTUAL = /[\p{L}\p{N}\p{P}]/u

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u

/**
 * Counts user-perceived characters, so a multi-codepoint emoji — skin tone
 * modifiers, ZWJ families like 👩‍👩‍👧‍👦 — counts as one and not as five.
 */
export function countGraphemes(text: string): number {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
    let count = 0
    for (const _ of segmenter.segment(text)) count++
    return count
  }
  // Code points still beat `.length` here, which would split surrogate pairs.
  return Array.from(text).length
}

/**
 * Should this message render at jumbo size? True for a short burst of emoji and
 * nothing else — the behaviour Slack and Discord both have, where "🔥" arrives
 * as a gesture rather than a word.
 */
export function isJumboEmoji(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed === "") return false
  if (TEXTUAL.test(trimmed)) return false
  if (!PICTOGRAPHIC.test(trimmed)) return false
  return countGraphemes(trimmed.replace(/\s/g, "")) <= JUMBO_MAX_LENGTH
}
