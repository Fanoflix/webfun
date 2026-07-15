import type { ReactNode } from "react"
import { useEffect } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"

import { toolFromPathname } from "./flags"
import { useFlags } from "./useFlags"

/**
 * Redirects home if the current route is a tool that hasn't been released yet
 * and this visitor has no unlock key.
 *
 * Released pages (and non-tool pages) render immediately — the gate costs them
 * nothing. Only an *unreleased* route holds its render back for the one tick it
 * takes to resolve the unlock, so a locked tool never flashes on screen before
 * the redirect, and a friend with the key never gets bounced by mistake.
 */
export function ToolGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const { ready, isVisible } = useFlags()

  const tool = toolFromPathname(pathname)
  // Before `ready`, `unlocked` is false — so this is true for any unreleased
  // route, which is exactly what holds its render back until we know.
  const gated = tool !== null && !isVisible(tool)

  useEffect(() => {
    if (ready && gated) navigate({ to: "/", replace: true })
  }, [ready, gated, navigate])

  if (gated) return null

  return <>{children}</>
}
