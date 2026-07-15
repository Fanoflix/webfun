import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

/**
 * Vite's `base` is the single source of truth for the URL prefix, but it always
 * carries a trailing slash ("/webfun/", or "/" locally). The router wants it
 * without one, so normalise here rather than relying on it to cope.
 */
const basepath = import.meta.env.BASE_URL.replace(/\/+$/, "") || "/"

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    // GitHub Pages serves this repo as a project site under /webfun, so the
    // router lives under that prefix too.
    basepath,

    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
