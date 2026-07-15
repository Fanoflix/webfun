// Makes the static build servable by GitHub Pages.
//
// 1. 404.html — Pages has no rewrite rules, so a deep link like /webfun/style-flow
//    would 404 (nothing exists at that path; only the SPA shell does). Pages
//    serves 404.html for unknown paths, so shipping the shell as 404.html lets
//    the client router pick the URL up and render the right route. The response
//    still carries a 404 status, which is invisible to users but does mean
//    crawlers treat deep links as missing — fine for a demo site.
//
// 2. .nojekyll — Pages runs Jekyll by default, which silently drops files and
//    folders whose names start with an underscore. Vite emits plenty of those.
import { copyFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"

const outDir = join(process.cwd(), "dist", "client")
const shell = join(outDir, "index.html")

if (!existsSync(shell)) {
  console.error(
    `[postbuild-pages] Expected an SPA shell at ${shell} but found none. ` +
      `Is spa.prerender.outputPath still "/index" in vite.config.ts?`
  )
  process.exit(1)
}

await copyFile(shell, join(outDir, "404.html"))
await writeFile(join(outDir, ".nojekyll"), "")

console.log("[postbuild-pages] wrote 404.html + .nojekyll")
