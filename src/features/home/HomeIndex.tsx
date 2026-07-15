import { Link } from "@tanstack/react-router"
import { ArrowUpRight } from "lucide-react"

import { useHomeNav } from "./useHomeNav"

/**
 * The landing page: every released tool as a card, grouped by category, so the
 * sidebar isn't the only way in. View-only — visibility lives in `useHomeNav`.
 */
export function HomeIndex() {
  const { groups } = useHomeNav()

  return (
    <div className="w-full max-w-3xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">webfun</h1>
        <p className="text-sm text-muted-foreground">
          Small experiments in things that looked cool enough to rebuild.
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.label} className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {group.label}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group relative flex h-52 flex-col justify-between overflow-hidden rounded-none border border-border p-6 pb-10 text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {/* Hover wash: accent fading out towards the top. Sits behind
                    the content, so everything below needs `relative`. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-radial-[at_50%_0%] from-accent/25 to-transparent opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100"
                />
                <div className="relative flex w-full items-center gap-2 text-lg font-thin tracking-wide">
                  <item.icon className="shrink-0" />
                  <span>{item.title}</span>
                  <ArrowUpRight className="ml-auto size-5 opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100" />
                </div>
                <p className="relative translate-y-0.5 text-sm text-pretty text-foreground/80 opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  {item.blurb}
                </p>{" "}
              </Link>
            ))}
          </div>
        </section>
      ))}

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing here yet — the first one lands soon.
        </p>
      )}
    </div>
  )
}
