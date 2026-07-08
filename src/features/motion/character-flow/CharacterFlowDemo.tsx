import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CharacterFlow } from "./CharacterFlow"
import { useCharacterFlowDemo } from "./useCharacterFlowDemo"

/**
 * Showcase for the CharacterFlow primitive. Type into the field or tap a preset
 * and watch shared characters slide to their new place while the rest roll in /
 * out. View-only — state lives in `useCharacterFlowDemo`.
 */
export function CharacterFlowDemo() {
  const { value, setValue, cycle, presetNames } = useCharacterFlowDemo()

  return (
    <div className="w-full max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">CharacterFlow</h1>
        <p className="text-sm text-muted-foreground">
          NumberFlow-style transitions for any string — shared characters slide,
          the rest roll in and out.
        </p>
      </div>

      <div className="flex min-h-40 items-center justify-center rounded-lg border border-border bg-card px-6 py-10">
        <CharacterFlow
          value={value}
          className="text-5xl font-semibold tracking-tight tabular-nums"
        />
      </div>

      <div className="space-y-3">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type to animate…"
          aria-label="Text to animate"
        />
        <div className="flex flex-wrap gap-2">
          {presetNames.map((name) => (
            <Button key={name} variant="outline" onClick={() => cycle(name)}>
              {name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
