/* SearchResultsHeader: Search results toolbar (count, inline search, filter, add) */

import { useEffect, useRef } from 'react'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { Button } from '../../../../components/Button'

interface SearchResultsHeaderProps {
  taskCount: number
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  onClearSearch: () => void
  onOpenFilter: () => void
  onAddTask: () => void
}

/**
 * Header for task name search results: mirrors filtered results layout with "Search results:" title.
 */
export function SearchResultsHeader({
  taskCount,
  searchQuery,
  onSearchQueryChange,
  onClearSearch,
  onOpenFilter,
  onAddTask,
}: SearchResultsHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)

  /* Focus search input when the search results view mounts */
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  const actionButtons = (
    <div className="flex shrink-0 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs lg:max-w-sm">
        <input
          ref={searchInputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search by name..."
          className="min-w-0 flex-1 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="Search tasks by name"
        />
        <button
          type="button"
          onClick={onClearSearch}
          className="shrink-0 rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
          aria-label="Close search"
        >
          <MaterialIcon name="close" />
        </button>
      </div>
      <button
        type="button"
        onClick={onOpenFilter}
        className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
        aria-label="Filter tasks"
      >
        <MaterialIcon name="tune" />
      </button>
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
            Search results:
          </h1>
          <p className="text-secondary shrink-0 font-bold uppercase tracking-wide text-on-surface-variant">
            {taskCount} {taskCount === 1 ? 'TASK' : 'TASKS'} FOUND
          </p>
        </div>
        {actionButtons}
      </div>

      {/* Row 2: active query + clear */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {searchQuery.trim() ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-bonsai-sage-200 bg-bonsai-sage-50 px-3 py-1 text-secondary font-medium text-bonsai-sage-800">
            &quot;{searchQuery.trim()}&quot;
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClearSearch}
          className="text-body shrink-0 font-medium text-bonsai-slate-600 hover:text-red-600"
        >
          Clear Search
        </button>
      </div>
    </header>
  )
}
