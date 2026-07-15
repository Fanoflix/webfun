import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * The title + blurb every tool page opens with. `children` is a node rather than
 * a string so a blurb can link out to whatever inspired the tool.
 */
export function ToolIntro({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-pretty text-muted-foreground">{children}</p>
    </div>
  )
}

/** An inline link inside a tool blurb (e.g. the project that inspired it). */
export function IntroLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-foreground underline decoration-muted-foreground/50 underline-offset-4 transition-colors hover:decoration-foreground"
    >
      {children}
    </a>
  )
}
