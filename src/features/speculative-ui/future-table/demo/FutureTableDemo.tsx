import { ToolIntro } from "@/components/layout/ToolIntro"
import { Button } from "@/components/ui/button"
import { FutureTable } from "../components/FutureTable"
import { useFutureTableDemo } from "./useFutureTableDemo"

/**
 * Demo view for the future-table: a departures board that always shows 10 fixed
 * slots. Load data to fill them, page through to re-project into the same slots,
 * or update in place. View-only — all state lives in `useFutureTableDemo`.
 */
export function FutureTableDemo() {
  const {
    table,
    pageIndex,
    hasData,
    load,
    clear,
    addRow,
    updateStatuses,
    nextPage,
    prevPage,
  } = useFutureTableDemo()

  return (
    <div className="w-full max-w-3xl space-y-4">
      <ToolIntro title="Concept table 1">
        Most tables throw their rows away and build new ones every time the data
        changes. This one never moves a row — the slots stay put and the contents
        flip over in place, like a train station departure board.
      </ToolIntro>

      <div className="flex flex-wrap gap-2">
        <Button onClick={load}>Load data</Button>
        <Button variant="outline" onClick={addRow}>
          Add row
        </Button>
        <Button variant="outline" onClick={updateStatuses} disabled={!hasData}>
          Update statuses
        </Button>
        <Button variant="outline" onClick={clear} disabled={!hasData}>
          Clear
        </Button>
      </div>

      <div className="border border-border">
        <FutureTable table={table} />
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <Button
          variant="outline"
          size="sm"
          onClick={prevPage}
          disabled={pageIndex === 0}
        >
          Prev
        </Button>
        <span className="tabular-nums">
          Page {pageIndex + 1} / {table.pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={nextPage}
          disabled={pageIndex >= table.pageCount - 1}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
