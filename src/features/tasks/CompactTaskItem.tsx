/* CompactTaskItem component: Reusable compact task display with consistent icon layout */

import {
  ChecklistIcon,
  TagIcon,
  CalendarIcon,
  UsersIcon,
  BlockedIcon,
  WarningIcon,
} from '../../components/icons'
import type { Task } from './types'

export interface CompactTaskItemProps {
  /** Task data to display */
  task: Task
  /** Checklist completed/total when task has checklists */
  checklistSummary?: { completed: number; total: number }
  /** Task is blocked by another (show blocked icon) */
  isBlocked?: boolean
  /** Task is blocking another (show warning icon) */
  isBlocking?: boolean
  /** Optional click handler for the entire item */
  onClick?: () => void
  /** Optional remove handler (shows × button) */
  onRemove?: () => void
  /** Optional handler for dependency icon click */
  onDependencyClick?: () => void
  /** Format date for display (e.g. Jan 22 at 12pm) */
  formatDueDate?: (iso: string | null | undefined) => string | null
}

/**
 * Compact task item component with standardized icon layout.
 * Displays task title with consistent metadata icons: checklist, tag, dependency status,
 * shared status, and due date. Used in modals, dependency sections, and other compact views.
 */
export function CompactTaskItem({
  task,
  checklistSummary,
  isBlocked = false,
  isBlocking = false,
  onClick,
  onRemove,
  onDependencyClick,
  formatDueDate,
}: CompactTaskItemProps) {
  /* Format date for display: use provided formatter or default */
  const defaultFormatDueDate = (iso: string | null | undefined): string | null => {
    if (!iso) return null
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  const formatDate = formatDueDate ?? defaultFormatDueDate
  const tagDisplay = task.tags?.[0]?.name ?? null
  const dueDisplay = formatDate(task.due_date ?? task.start_date)

  return (
    <div
      className="compact-task-item rounded-lg border border-dashed border-amber-200 bg-white px-3 py-2 shadow-sm"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      {/* Title row: task title and remove button */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-bonsai-slate-800 truncate">
          {task.title}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="shrink-0 text-bonsai-slate-400 hover:text-bonsai-slate-600 rounded p-0.5"
            aria-label="Remove"
          >
            <span className="text-sm">×</span>
          </button>
        )}
      </div>
      {/* Metadata row: checklist, tag, dependency, shared, due date icons */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-bonsai-slate-600">
        {/* Checklist icon: show completed/total if available, otherwise show dash */}
        <span className="inline-flex items-center gap-1">
          <ChecklistIcon className="w-3.5 h-3.5" />
          {checklistSummary && checklistSummary.total > 0
            ? `${checklistSummary.completed}/${checklistSummary.total}`
            : '—'}
        </span>
        {/* Tag icon: show tag name if available */}
        {tagDisplay && (
          <span className="inline-flex items-center gap-1 rounded bg-bonsai-slate-200 px-1.5 py-0.5">
            <TagIcon className="w-3.5 h-3.5" />
            {tagDisplay}
          </span>
        )}
        {/* Dependency icon: blocked icon or blocking icon */}
        {(isBlocked || isBlocking) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDependencyClick?.()
            }}
            className="inline-flex items-center rounded p-0.5 hover:bg-bonsai-slate-100 text-bonsai-slate-600"
            aria-label={isBlocked ? 'This task is blocked' : 'This task is blocking'}
          >
            {isBlocked ? (
              <BlockedIcon className="w-4 h-4" />
            ) : (
              <WarningIcon className="w-4 h-4" />
            )}
          </button>
        )}
        {/* Shared icon: always shown */}
        <span className="inline-flex items-center gap-1">
          <UsersIcon className="w-3.5 h-3.5" />
        </span>
        {/* Due date icon: show date if available */}
        {dueDisplay && (
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            {dueDisplay}
          </span>
        )}
      </div>
    </div>
  )
}
