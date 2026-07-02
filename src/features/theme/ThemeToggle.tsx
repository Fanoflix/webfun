import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

import { applyTheme, getStoredTheme } from "./theme"
import type { Theme } from "./theme"

/**
 * A labelled pill that toggles the theme and reads the current mode ("dark" /
 * "light"). Rendered in the sidebar footer next to the contribute link.
 */
export function ThemeToggle() {
  // Server + first client render assume the default (dark); the effect syncs to
  // whatever was actually persisted, matching the no-flash head script.
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    setTheme(getStoredTheme())
  }, [])

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark"
    applyTheme(next)
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex items-center gap-1.5 rounded-md border border-sidebar-border px-2.5 py-1.5 text-xs text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      {theme === "dark" ? (
        <Moon className="size-3.5" />
      ) : (
        <Sun className="size-3.5" />
      )}
      {theme}
    </button>
  )
}
