export type Theme = "dark" | "light"

const STORAGE_KEY = "theme"

/** Read the persisted theme, defaulting to dark. Safe to call on the server. */
export function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "dark"
  return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark"
}

/** Apply a theme to <html> and persist it. Client-only. */
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  localStorage.setItem(STORAGE_KEY, theme)
}

/**
 * Runs in <head> before first paint so the correct theme class is on <html>
 * immediately — no flash of the wrong theme on load. Defaults to dark.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");document.documentElement.classList.toggle("dark",t!=="light")}catch(e){document.documentElement.classList.add("dark")}})()`
