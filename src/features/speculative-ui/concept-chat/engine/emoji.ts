/**
 * The emoji picker's contents — a curated grid, no search, no dependency.
 *
 * A full emoji dataset is ~1.8MB of JSON and a search index nobody in a demo will
 * use. Sixty common ones cover every realistic reaction and every message someone
 * will actually type here.
 */

export type EmojiGroup = {
  label: string
  emoji: readonly string[]
}

export const EMOJI_GROUPS: readonly EmojiGroup[] = [
  {
    label: "Smileys",
    emoji: [
      "😀", "😂", "🥲", "😅", "😊", "🙂", "😉", "😍",
      "😘", "😜", "🤪", "🤗", "🤔", "🫠", "😐", "😴",
      "😭", "😤", "😱", "🥶", "😳", "🥺", "😬", "🙃",
    ],
  },
  {
    label: "Gestures",
    emoji: ["👍", "👎", "👌", "🤌", "👏", "🙌", "🤝", "🫡", "🙏", "💪", "🖖", "👀"],
  },
  {
    label: "Hearts",
    emoji: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "💯", "✨"],
  },
  {
    label: "Objects",
    emoji: ["🔥", "🎉", "🎯", "⚡", "💀", "🧠", "👻", "🚀", "🍿", "☕", "🐈", "🌚"],
  },
] as const

/** Flat list, for anything that just needs "is this one of ours". */
export const ALL_EMOJI: readonly string[] = EMOJI_GROUPS.flatMap((g) => g.emoji)

/**
 * What the fake chatter picks from when it reacts. Kept warm and low-stakes —
 * it reacts to whatever you wrote without having read it.
 */
export const CHATTER_REACTIONS: readonly string[] = ["😂", "🔥", "👀", "💯", "🫡", "❤️"]
