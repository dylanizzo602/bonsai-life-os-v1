/* SortModal: Modal popover for configuring task sort order (field + direction, reorderable) */

import { Modal } from '../../../components/Modal'
import { PlusIcon, CloseIcon } from '../../../components/icons'
import type { SortByEntry, SortFieldId } from '../types'

const SORT_FIELDS: { id: SortFieldId; label: string }[] = [
  { id: 'start_date', label: 'Start Date' },
  { id: 'due_date', label: 'Due Date' },
  { id: 'priority', label: 'Priority' },
  { id: 'time_estimate', label: 'Time Estimates' },
  { id: 'status', label: 'Status' },
  { id: 'task_name', label: 'Task Name' },
]

const DIRECTION_LABELS: Record<SortFieldId, { asc: string; desc: string }> = {
  start_date: { asc: 'Earliest first', desc: 'Latest first' },
  due_date: { asc: 'Earliest first', desc: 'Latest first' },
  priority: { asc: 'Lowest to highest', desc: 'Highest to lowest' },
  time_estimate: { asc: 'Lowest to highest', desc: 'Highest to lowest' },
  status: { asc: 'Open → In progress → Closed', desc: 'Closed → In progress → Open' },
  task_name: { asc: 'A–Z', desc: 'Z–A' },
}

export interface SortModalProps {
  isOpen: boolean
  onClose: () => void
  sortBy: SortByEntry[]
  onSortByChange: (sortBy: SortByEntry[]) => void
  onApply?: () => void
  /** Shown when sortBy is empty (e.g. "Default order (newest first)" for All Tasks view) */
  defaultSortLabel?: string
}

/**
 * Sort modal: add sort fields (plus), list of rows with field + direction, reorderable and removable.
 * Applying sort updates parent state and optionally switches to Custom view.
 */
export function SortModal({
  isOpen,
  onClose,
  sortBy,
  onSortByChange,
  onApply,
  defaultSortLabel,
}: SortModalProps) {
  const handleAddSort = (field: SortFieldId) => {
    const direction = field === 'task_name' || field === 'start_date' || field === 'due_date' ? 'asc' : 'desc'
    onSortByChange([...sortBy, { field, direction }])
  }

  const handleRemove = (index: number) => {
    onSortByChange(sortBy.filter((_, i) => i !== index))
  }

  const handleDirectionToggle = (index: number) => {
    const next = [...sortBy]
    next[index] = { ...next[index], direction: next[index].direction === 'asc' ? 'desc' : 'asc' }
    onSortByChange(next)
  }

  const handleApply = () => {
    onApply?.()
    onClose()
  }

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-4 py-2 text-body font-medium bg-bonsai-slate-100 text-bonsai-slate-700 hover:bg-bonsai-slate-200"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleApply}
        className="rounded-lg px-4 py-2 text-body font-medium bg-bonsai-sage-600 text-white hover:bg-bonsai-sage-700"
      >
        Apply
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sort" fullScreenOnMobile footer={footer}>
      <div className="flex flex-col gap-4">
        <p className="text-secondary text-bonsai-slate-600">
          Tasks are sorted by the fields below in order. Add levels with the plus button.
        </p>

        {/* Sort list: each row = field name + direction (click to toggle) + remove; show default label when empty */}
        <div className="flex flex-col gap-2">
          {sortBy.length === 0 && defaultSortLabel ? (
            <p className="text-secondary text-bonsai-slate-500 py-1">{defaultSortLabel}</p>
          ) : null}
          {sortBy.map((entry, index) => (
            <div
              key={`${entry.field}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 px-3 py-2"
            >
              <span className="text-body font-medium text-bonsai-slate-800 flex-1">
                {SORT_FIELDS.find((f) => f.id === entry.field)?.label ?? entry.field}
              </span>
              <button
                type="button"
                onClick={() => handleDirectionToggle(index)}
                className="text-secondary text-bonsai-slate-600 hover:text-bonsai-slate-800 text-sm font-medium"
              >
                {DIRECTION_LABELS[entry.field]?.[entry.direction] ?? entry.direction}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-1.5 rounded-full text-bonsai-slate-500 hover:bg-bonsai-slate-200 hover:text-bonsai-slate-700"
                aria-label="Remove sort"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add sort: plus button and dropdown to pick field */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const first = SORT_FIELDS[0]
              if (first) handleAddSort(first.id)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-body font-medium text-bonsai-sage-700 bg-bonsai-sage-100 hover:bg-bonsai-sage-200"
          >
            <PlusIcon className="w-4 h-4" />
            Add sort
          </button>
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value as SortFieldId
              if (v) handleAddSort(v)
              e.target.value = ''
            }}
            className="rounded-lg border border-bonsai-slate-300 px-3 py-2 text-body text-bonsai-slate-700 bg-white"
            aria-label="Add sort field"
          >
            <option value="">Add another field…</option>
            {SORT_FIELDS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  )
}
