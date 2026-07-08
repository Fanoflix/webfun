import { motion } from "motion/react"

import { cn } from "@/lib/utils"

/** Height of one wheel row, in px — the ribbon translates by multiples of this. */
const ROW_H = 42

type WordWheelProps = {
  words: string[]
  index: number
}

/**
 * A vertical slot-machine reel of the Words cycle. The active word sits centered;
 * changing `index` rolls the ribbon to it with a spring. Rows fade with distance
 * from center and the whole column is masked top/bottom so words dissolve at the
 * edges. View-only.
 */
export function WordWheel({ words, index }: WordWheelProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden border border-border bg-card [mask-image:linear-gradient(to_bottom,transparent,black_22%,black_78%,transparent)]"
      aria-hidden
    >
      <motion.div
        className="absolute inset-x-0 top-1/2 flex flex-col"
        animate={{ y: -index * ROW_H - ROW_H }}
        transition={{
          type: "spring",
          stiffness: 250,
          damping: 24,
          duration: 0.02,
        }}
      >
        {words.map((word, i) => {
          const distance = Math.abs(i - index)
          return (
            <div
              key={`${word}-${i}`}
              style={{ height: ROW_H }}
              className={cn(
                "flex items-center justify-center text-center text-base font-medium whitespace-nowrap transition-all duration-100",
                i === index
                  ? "scale-115 text-foreground opacity-100"
                  : "text-muted-foreground",
                distance >= 1 && "opacity-30"
              )}
            >
              {word}
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}
