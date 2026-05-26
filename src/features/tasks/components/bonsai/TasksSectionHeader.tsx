/* TasksSectionHeader: Page/section chrome for Bonsai tasks layout (search, filter, add) */

import { useEffect, useRef } from 'react'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { Button } from '../../../../components/Button'

interface TasksSectionHeaderProps {
  /** Expand inline search input */
  searchExpanded: boolean
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  onSearchExpandedChange: (expanded: boolean) => void
  onOpenFilter: () => void
  /** Add a new task (md+ toolbar); below md uses floating FAB in TasksBonsaiView */
  onAddTask: () => void
}

/**
 * Responsive tasks header: mobile page title + actions (< md); desktop lineup title + toolbar (md+).
 */
export function TasksSectionHeader({
  searchExpanded,
  searchQuery,
  onSearchQueryChange,
  onSearchExpandedChange,
  onOpenFilter,
  onAddTask,
}: TasksSectionHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)

  /* Focus inline search when the user expands the search bar */
  useEffect(() => {
    if (searchExpanded) {
      searchInputRef.current?.focus()
    }
  }, [searchExpanded])

  const actionButtons = (
    <div className="flex items-center gap-2">
      {searchExpanded ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
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
            aria-label="Search tasks"
          >
            <MaterialIcon name="search" />
          </button>
          <button
            type="button"
            onClick={onOpenFilter}
            className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
            aria-label="Filter tasks"
          >
            <MaterialIcon name="tune" />
          </button>
        </>
      )}
      {/* md+: inline next to filter; below md FAB handles add */}
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
    <>
      {/* Mobile: page title and toolbar */}
      <div className="mb-8 flex items-start justify-between md:hidden">
        <div>
          <h1 className="text-page-title font-semibold tracking-tight text-on-surface">Tasks</h1>
          <p className="text-secondary mt-1 text-on-surface-variant/70">
            Focus on what matters today.
          </p>
        </div>
        {!searchExpanded ? actionButtons : null}
      </div>
      {searchExpanded ? (
        <div className="mb-6 md:hidden">{actionButtons}</div>
      ) : null}

      {/* Desktop/tablet: Today's Lineup section header */}
      <div className="mb-8 hidden items-center justify-between md:flex">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-on-surface lg:text-[32px]">
            Today&apos;s Lineup
          </h2>
          <p className="text-secondary mt-1 text-on-surface-variant/70">
            Some items you may want to get done.
          </p>
        </div>
        {actionButtons}
      </div>
    </>
  )
}
