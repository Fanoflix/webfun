import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import { AppLayout } from "@/components/layout/AppLayout"
import { themeInitScript } from "@/features/theme/theme"
import appCss from "../styles.css?url"

const TITLE = "webfun — web stuff, no impact, just satisfying"
const DESCRIPTION =
  "Small interactive experiments in graphics, motion and speculative UI. Things that looked cool enough to rebuild."

/**
 * Everything under `public/` has to be reached through the base path.
 *
 * GitHub Pages serves this as a project site at `/webfun/`, so a bare
 * `/favicon.svg` resolves against the *domain* root and 404s — which is exactly
 * what was happening, since nothing declared an icon at all and the browser was
 * falling back to requesting `/favicon.ico` for itself.
 */
const asset = (path: string) =>
  `${import.meta.env.BASE_URL.replace(/\/+$/, "")}/${path}`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      /**
       * Open Graph and Twitter, because the way anyone actually arrives here is
       * a link pasted into a chat — and an unfurl showing a bare URL is the
       * difference between someone opening it and scrolling past.
       */
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "webfun" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      /**
       * Tints browser chrome on mobile. One value, not a pair scoped to
       * `prefers-color-scheme`: the app is dark unless someone has explicitly
       * toggled it, and doesn't follow the OS at all — so a light variant would
       * tint the chrome against a page that stayed dark. (Two would also be
       * pointless here regardless: same-named metas are deduplicated, and only
       * one survives into the document.)
       */
      { name: "theme-color", content: "#0a0a0a" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // SVG only. It's also the only format that can follow the tab strip's
      // theme, via the `prefers-color-scheme` rule inside the file — every
      // browser that would need a raster fallback predates that anyway.
      { rel: "icon", type: "image/svg+xml", href: asset("favicon.svg") },
      { rel: "manifest", href: asset("manifest.json") },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  component: AppLayout,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
