import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { applyTheme, getStoredTheme } from "./theme"
import type { Theme } from "./theme"

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
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  )
}
