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
/**
 * Every route that gets its own prerendered HTML file.
 *
 * Without this the build emits only the SPA shell, and a deep link like
 * `/webfun/dithering` is served by `404.html` — which works for a person (the
 * client router picks the URL up) but carries a 404 status, so a crawler treats
 * it as missing and renders no unfurl at all. Since the site is shared far more
 * often than it is browsed to, that made every tool link unpostable.
 *
 * Prerendering each one gives it a real 200 *and* its own `<title>` / OG tags in
 * the static HTML, which is the only version a crawler ever sees — none of them
 * run JavaScript.
 *
 * Adding a tool means adding it here too; see AGENTS.md.
 */
const PRERENDERED_PATHS = [
  "/dithering",
  "/anti-aliasing",
  "/low-res-video",
  "/character-flow",
  "/style-flow",
  "/future-table",
  "/concept-chat",
  "/tanstack-showcase",
]

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
      // `crawlLinks: false`: the shell's sidebar links every route, and the
      // crawler follows them *with* the `/webfun/` base still attached, so each
      // page came out twice — once at the path we asked for and once as a
      // subfolder index. The list below is explicit; nothing needs discovering.
      spa: {
        enabled: true,
        prerender: { outputPath: "/index", crawlLinks: false },
      },
      // `autoSubfolderIndex: false` emits `dithering.html` rather than
      // `dithering/index.html`. GitHub Pages resolves an extensionless request
      // to the `.html` file, so `/webfun/dithering` is a direct 200 with no
      // redirect — a redirect would work for browsers but costs a hop that some
      // unfurl crawlers don't take.
      pages: PRERENDERED_PATHS.map((path) => ({
        path,
        prerender: {
          enabled: true,
          autoSubfolderIndex: false,
          crawlLinks: false,
        },
      })),
    }),
    viteReact(),
  ],
}))

export default config
