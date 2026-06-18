/* ReflectionEntryListItem: Single row in the Recent Entries list */

import type { MouseEvent } from 'react'
import type { ReflectionEntry } from '../types'
import {
  formatEntryDate,
  getEntryDisplayTitle,
  getEntryExcerpt,
  getEntryTypeBadgeClass,
  getEntryTypeLabel,
} from '../utils/entryDisplay'

interface ReflectionEntryListItemProps {
  entry: ReflectionEntry
  onClick: (entry: ReflectionEntry) => void
  onContextMenu: (entry: ReflectionEntry, event: MouseEvent) => void
}

/**
 * List row for a reflection entry: type badge, date, title, and excerpt preview.
 */
export function ReflectionEntryListItem({
  entry,
  onClick,
  onContextMenu,
}: ReflectionEntryListItemProps) {
  const excerpt = getEntryExcerpt(entry)

  return (
    <button
      type="button"
      onClick={() => onClick(entry)}
      onContextMenu={(event) => onContextMenu(entry, event)}
      className="group flex w-full flex-col border-b border-outline-variant/30 bg-surface-container-lowest p-5 text-left transition-colors last:border-b-0 hover:bg-surface-container-low cursor-pointer"
    >
      {/* Metadata row: type badge and date */}
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getEntryTypeBadgeClass(entry.type)}`}
        >
          {getEntryTypeLabel(entry.type)}
        </span>
        <span className="text-[11px] text-outline">{formatEntryDate(entry.created_at)}</span>
      </div>

      {/* Title and excerpt */}
      <h4 className="mb-1 text-body font-bold text-on-surface transition-colors group-hover:text-primary">
        {getEntryDisplayTitle(entry)}
      </h4>
      {excerpt && (
        <p className="line-clamp-2 text-secondary leading-relaxed text-on-surface-variant">
          {excerpt}
        </p>
      )}
    </button>
  )
}
