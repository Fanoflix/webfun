import { Popover } from "@base-ui/react/popover"
import type { ReactElement, ReactNode } from "react"

import { GIF_IDS, IMAGE_IDS, gifUrl, imageUrl } from "../engine/assets"
import type { GifId, ImageId } from "../engine/types"

/**
 * The `+` menu: pick from the bundled media.
 *
 * No uploads by design — the thread is persisted, and persisting someone's own
 * files is a different product. The set is small and fixed, so it's a grid rather
 * than a search.
 */
export function AttachPanel({
  trigger,
  onPickImage,
  onPickGif,
}: {
  trigger: ReactElement
  onPickImage: (id: ImageId) => void
  onPickGif: (id: GifId) => void
}) {
  return (
    <Popover.Root>
      <Popover.Trigger render={trigger} />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start">
          <Popover.Popup className="z-50 max-h-80 w-64 overflow-y-auto border border-border bg-popover p-2 shadow-md">
            <Section label="Images">
              {IMAGE_IDS.map((id) => (
                <Thumb
                  key={id}
                  src={imageUrl(id)}
                  label={id}
                  onPick={() => onPickImage(id)}
                />
              ))}
            </Section>
            <Section label="Gifs">
              {GIF_IDS.map((id) => (
                <Thumb
                  key={id}
                  src={gifUrl(id)}
                  label={id}
                  onPick={() => onPickGif(id)}
                />
              ))}
            </Section>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="px-1 pb-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-1">{children}</div>
    </div>
  )
}

function Thumb({
  src,
  label,
  onPick,
}: {
  src: string
  label: string
  onPick: () => void
}) {
  return (
    <Popover.Close
      onClick={onPick}
      aria-label={label}
      className="border border-border transition-colors duration-150 hover:border-muted-foreground/50"
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        className="block h-16 w-full object-cover"
      />
    </Popover.Close>
  )
}
