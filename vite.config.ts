import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

/**
 * GitHub Pages serves this repo as a *project site* at `/webfun/`, so production
 * builds need that prefix on every asset URL; dev stays at the root. Override
 * with `VITE_BASE` (e.g. `VITE_BASE=/` if this ever moves to a custom domain).
 *
 * The router reads this back via `import.meta.env.BASE_URL`, so `base` is the
 * single source of truth for the prefix.
 */
const config = defineConfig(({ command }) => ({
  base: process.env.VITE_BASE ?? (command === "build" ? "/webfun/" : "/"),
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    // Static SPA build: no server at runtime. A shell is prerendered at build
    // time and the client router takes over, which is all GitHub Pages can host.
    // The shell lands at `index.html` (instead of the default `_shell.html`) so
    // Pages serves it as the site root.
    tanstackStart({
      spa: { enabled: true, prerender: { outputPath: "/index" } },
    }),
    viteReact(),
  ],
}))

export default config
