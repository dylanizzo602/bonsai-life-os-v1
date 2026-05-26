/* FilteredResultsHeader: Filtered Results toolbar (chips, count, clear, search, tune, add) */

import { MaterialIcon } from '../../../../components/MaterialIcon'
import { Button } from '../../../../components/Button'
import type { FilterSummaryChip } from '../../utils/filterSummary'

interface FilteredResultsHeaderProps {
  chips: FilterSummaryChip[]
  taskCount: number
  searchExpanded: boolean
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  onSearchExpandedChange: (expanded: boolean) => void
  onOpenFilter: () => void
  onRemoveChip: (conditionId: string) => void
  onClearFilters: () => void
  onAddTask: () => void
}

/**
 * Header for filtered task list: title + count vs actions; applied filters + Clear on the next line.
 */
export function FilteredResultsHeader({
  chips,
  taskCount,
  searchExpanded,
  searchQuery,
  onSearchQueryChange,
  onSearchExpandedChange,
  onOpenFilter,
  onRemoveChip,
  onClearFilters,
  onAddTask,
}: FilteredResultsHeaderProps) {
  const actionButtons = (
    <div className="flex shrink-0 items-center gap-2">
      {searchExpanded ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs lg:max-w-sm">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search by name..."
            className="min-w-0 flex-1 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Search filtered tasks"
          />
          <button
            type="button"
            onClick={() => {
              onSearchQueryChange('')
              onSearchExpandedChange(false)
            }}
            className="shrink-0 rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
            aria-label="Close search"
          >
            <MaterialIcon name="close" />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onSearchExpandedChange(true)}
            className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
            aria-label="Search filtered tasks"
          >
            <MaterialIcon name="search" />
          </button>
          <button
            type="button"
            onClick={onOpenFilter}
            className="rounded-lg bg-bonsai-sage-100 p-2 text-bonsai-sage-700 transition-colors hover:bg-bonsai-sage-200"
            aria-label="Edit filters"
            aria-pressed
          >
            <MaterialIcon name="tune" />
          </button>
        </>
      )}
      <Button
        variant="primary"
        onClick={onAddTask}
        className="hidden shrink-0 items-center gap-2 rounded-xl px-6 py-2.5 shadow-sm active:scale-95 md:ml-2 md:inline-flex"
      >
        <MaterialIcon name="add" className="text-lg" />
        New Task
      </Button>
    </div>
  )

  return (
    <header className="mb-8">
      {/* Row 1: title + task count vs toolbar actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-page-title shrink-0 font-semibold tracking-tight text-on-surface lg:text-[32px]">
            Filtered Results:
          </h1>
          <p className="text-secondary shrink-0 font-bold uppercase tracking-wide text-on-surface-variant">
            {taskCount} {taskCount === 1 ? 'TASK' : 'TASKS'} FOUND
          </p>
        </div>
        {actionButtons}
      </div>

      {/* Row 2: applied filter chips, then Clear Filters at the end */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <span
            key={chip.id}
            className="inline-flex items-center gap-1 rounded-full border border-bonsai-sage-200 bg-bonsai-sage-50 px-3 py-1 text-secondary font-medium text-bonsai-sage-800"
          >
            {chip.label}
            <button
              type="button"
              onClick={() => onRemoveChip(chip.id)}
              className="rounded-full p-0.5 hover:bg-bonsai-sage-200"
              aria-label={`Remove filter ${chip.label}`}
            >
              <MaterialIcon name="close" className="text-[16px]" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={onClearFilters}
          className="text-body shrink-0 font-medium text-bonsai-slate-600 hover:text-red-600"
        >
          Clear Filters
        </button>
      </div>
    </header>
  )
}
