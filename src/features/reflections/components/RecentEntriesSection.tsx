/* RecentEntriesSection: Toolbar, entry list, filter chips, and load-more for Reflect landing */

import { useCallback, useRef, useState } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { ReflectionEntry } from '../types'
import { getEntryTypeLabel } from '../utils/entryDisplay'
import { ReflectionEntryListItem } from './ReflectionEntryListItem'
import { ReflectionFilterPopover } from './ReflectionFilterPopover'

interface RecentEntriesSectionProps {
  entries: ReflectionEntry[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  search: string
  onSearchChange: (value: string) => void
  typeFilter: string[]
  onTypeFilterChange: (types: string[]) => void
  hasMore: boolean
  onLoadMore: () => void
  onNewEntry: () => void
  onEntryClick: (entry: ReflectionEntry) => void
  onEntryContextMenu: (entry: ReflectionEntry, event: React.MouseEvent) => void
}

/**
 * Recent Entries section: search, new entry, filter, list, and load-more footer.
 */
export function RecentEntriesSection({
  entries,
  loading,
  loadingMore,
  error,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  hasMore,
  onLoadMore,
  onNewEntry,
  onEntryClick,
  onEntryContextMenu,
}: RecentEntriesSectionProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const filterButtonRef = useRef<HTMLDivElement>(null)

  /* Toggle a type in the multi-select filter */
  const handleToggleType = useCallback(
    (type: string) => {
      if (typeFilter.includes(type)) {
        onTypeFilterChange(typeFilter.filter((t) => t !== type))
      } else {
        onTypeFilterChange([...typeFilter, type])
      }
    },
    [typeFilter, onTypeFilterChange],
  )

  const handleRemoveFilterChip = (type: string) => {
    onTypeFilterChange(typeFilter.filter((t) => t !== type))
  }

  return (
    <section className="pb-12">
      {/* Toolbar: title, search, new entry, filter */}
      <div className="flex flex-col items-start justify-between gap-4 pb-6 sm:flex-row sm:items-center">
        <h2 className="text-body font-bold text-on-surface">Recent Entries</h2>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          {/* Search input */}
          <label className="flex h-10 min-w-[200px] w-full flex-col lg:w-48">
            <div className="flex h-full w-full flex-1 items-stretch overflow-hidden rounded-lg bg-[#edeeed]">
              <div className="flex items-center justify-center pl-3 text-[#70766f]">
                <MaterialIcon name="search" className="text-[20px]" />
              </div>
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search entries..."
                className="form-input h-full min-w-0 flex-1 resize-none overflow-hidden border-none bg-transparent px-3 text-sm font-normal text-[#141514] placeholder:text-[#70766f] focus:outline-0 focus:ring-0"
                aria-label="Search reflection entries"
              />
            </div>
          </label>

          {/* New Entry button */}
          <button
            type="button"
            onClick={onNewEntry}
            className="flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 text-sm font-bold text-on-primary transition-opacity hover:opacity-90"
          >
            <MaterialIcon name="add" className="text-base" />
            New Entry
          </button>

          {/* Filter button + popover */}
          <div className="relative shrink-0" ref={filterButtonRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="rounded-lg p-2 text-outline transition-colors hover:bg-surface-container"
              aria-label="Filter entries by type"
              aria-expanded={filterOpen}
            >
              <MaterialIcon name="filter_list" />
            </button>
            <ReflectionFilterPopover
              open={filterOpen}
              selectedTypes={typeFilter}
              onToggleType={handleToggleType}
              onClear={() => onTypeFilterChange([])}
              onClose={() => setFilterOpen(false)}
              anchorRef={filterButtonRef}
            />
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {typeFilter.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {typeFilter.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleRemoveFilterChip(type)}
              className="flex items-center gap-1 rounded-full border border-bonsai-sage-200 bg-bonsai-sage-50 px-3 py-1 text-secondary text-on-surface-variant transition-colors hover:bg-bonsai-sage-100"
            >
              {getEntryTypeLabel(type)}
              <MaterialIcon name="close" className="text-sm" />
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-body text-red-700">
          {error}
        </div>
      )}

      {/* Entry list or empty/loading states */}
      {loading && entries.length === 0 ? (
        <p className="text-body text-bonsai-slate-500 py-8">Loading reflections…</p>
      ) : entries.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest px-6 py-12 text-center">
          <p className="text-body font-semibold text-on-surface">No reflections yet</p>
          <p className="mt-2 text-secondary text-on-surface-variant">
            Complete a briefing or create a journal entry to get started.
          </p>
          <button
            type="button"
            onClick={onNewEntry}
            className="mt-4 flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-on-primary"
          >
            <MaterialIcon name="add" className="text-base" />
            New Entry
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-outline-variant/30">
          {entries.map((entry) => (
            <ReflectionEntryListItem
              key={entry.id}
              entry={entry}
              onClick={onEntryClick}
              onContextMenu={onEntryContextMenu}
            />
          ))}
        </div>
      )}

      {/* Load more footer */}
      {hasMore && entries.length > 0 && (
        <div className="flex justify-center border-t border-outline-variant px-4 py-8">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 text-sm font-bold text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more reflections'}
            <MaterialIcon name="expand_more" className="text-sm" />
          </button>
        </div>
      )}
    </section>
  )
}
