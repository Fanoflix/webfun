import type { Comment } from "../engine/types"
import { AssigneeAvatar } from "./TicketMeta"
import { displayName } from "./people"

/**
 * The comment thread under a ticket body, laid out the way Linear does it: a
 * quiet divider, then a stack of short entries with the author's avatar beside
 * their name.
 *
 * Read-only on purpose — there is no compose box, because a comment nobody can
 * write is still enough to make the pane feel like a real issue tracker, and a
 * working one would be a second write path competing for attention with the one
 * the entry is actually about.
 */
export function TicketComments({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) {
    return (
      <p className="border-t border-border pt-6 text-xs text-muted-foreground">
        No comments yet.
      </p>
    )
  }

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <h3 className="text-xs font-medium text-muted-foreground">
        {comments.length} {comments.length === 1 ? "comment" : "comments"}
      </h3>

      <ul className="space-y-2">
        {comments.map((comment) => (
          <li
            key={comment.id}
            className="flex gap-2 rounded-md border border-border/45 bg-muted/35 p-2"
          >
            <AssigneeAvatar name={comment.author} className="mt-0.5 size-6" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex items-baseline gap-2">
                <span className="text-[11px] font-bold">
                  {displayName(comment.author)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {comment.at}
                </span>
              </p>
              {/* Full-strength text: a comment is content, not metadata. Only
                  the name and timestamp around it are secondary. */}
              <p className="text-sm leading-relaxed text-pretty">
                {comment.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
