import { motion } from "motion/react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

/** Height of one wheel row, in px — the ribbon translates by multiples of this. */
const ROW_H = 38

type WordWheelProps = {
  words: string[]
  index: number
  onSelect: (index: number) => void
  onRemove: (index: number) => void
}

/**
 * A vertical slot-machine reel of the Words cycle. The active word sits centered;
 * changing `index` rolls the ribbon to it with a spring. Rows fade with distance
 * from center and the column is masked top/bottom. Click a row to jump to it;
 * hover a row to reveal a cross that removes it.
 */
export function WordWheel({
  words,
  index,
  onSelect,
  onRemove,
}: WordWheelProps) {
  const canRemove = words.length > 1
  return (
    <div className="relative h-full w-full overflow-hidden border border-border bg-card [mask-image:linear-gradient(to_bottom,transparent,black_22%,black_78%,transparent)]">
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
                "group flex items-center justify-center transition-all duration-100",
                i === index
                  ? "text-foreground opacity-100"
                  : "text-muted-foreground",
                distance >= 1 && "opacity-30"
              )}
            >
              {/* A definite 95%-of-wheel box so the cross can sit at 80% of the
                  word and the word can truncate to that same 80% mark. */}
              <div className="relative w-[95%]">
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  className="block w-full truncate text-center text-base font-medium"
                >
                  {word}
                </button>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    aria-label={`Remove ${word}`}
                    className="absolute top-1/2 left-[80%] grid size-7 -translate-y-1/2 place-items-center bg-card text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}
