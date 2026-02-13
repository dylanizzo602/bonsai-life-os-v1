/* CompactTaskItem component: Minimal compact task display with essential information only.
 * Top row: status and task name.
 * Bottom row: tag, dependency, start/due date, and flag.
 * No hover tooltips; safe for compact views and small screens. */

import {
  CalendarIcon,
  BlockedIcon,
  WarningIcon,
  RepeatIcon,
  FlagIcon,
} from '../../components/icons'
import type { Task, TaskPriority, TaskStatus } from './types'

/** Display status for the status circle: OPEN, IN PROGRESS, COMPLETE (maps from TaskStatus) */
type DisplayStatus = 'open' | 'in_progress' | 'complete'

export interface CompactTaskItemProps {
  /** Task data to display */
  task: Task
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

/** Map TaskStatus to display status for the status circle */
function getDisplayStatus(status: TaskStatus): DisplayStatus {
  if (status === 'completed') return 'complete'
  return 'open'
}

/**
 * Status circle: OPEN = black dotted stroke no fill, IN PROGRESS = dotted yellow + fill, COMPLETE = solid green + fill.
 */
function TaskStatusIndicator({ status }: { status: DisplayStatus }) {
  const size = 20
  const r = (size - 4) / 2
  const cx = size / 2
  const cy = size / 2

  if (status === 'complete') {
    return (
      <svg width={size} height={size} className="shrink-0" aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="var(--color-green-500, #22c55e)"
          stroke="var(--color-green-600, #16a34a)"
          strokeWidth={2}
        />
      </svg>
    )
  }

  if (status === 'in_progress') {
    return (
      <svg width={size} height={size} className="shrink-0" aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="var(--color-yellow-400, #facc15)"
          stroke="var(--color-yellow-500, #eab308)"
          strokeWidth={2}
          strokeDasharray="3 2"
        />
      </svg>
    )
  }

  /* OPEN: black dotted stroke, no fill */
  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray="2 2"
        className="text-bonsai-slate-800"
      />
    </svg>
  )
}

/** Priority flag color classes: none, low, normal (medium), high, urgent */
function getPriorityFlagClasses(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    none: 'stroke-bonsai-slate-800 fill-white',
    low: 'stroke-bonsai-slate-400 fill-bonsai-slate-100 text-bonsai-slate-500',
    medium: 'stroke-blue-500 fill-blue-50 text-blue-600',
    high: 'stroke-yellow-500 fill-yellow-100 text-yellow-600',
    urgent: 'stroke-red-500 fill-red-100 text-red-600',
  }
  return map[priority] ?? map.none
}

/**
 * Compact task item component with minimal two-row layout.
 * Top row: status circle and task name.
 * Bottom row: tag, dependency icons, start/due date, and priority flag.
 * Used for compact views where space is limited.
 */
export function CompactTaskItem({
  task,
  isBlocked = false,
  isBlocking = false,
  onClick,
  onRemove,
  onDependencyClick,
  formatDueDate,
}: CompactTaskItemProps) {
  const displayStatus = getDisplayStatus(task.status)
  /* Format date for display: use provided formatter or default. Date-only (YYYY-MM-DD) parsed as local. */
  const defaultFormatDueDate = (iso: string | null | undefined): string | null => {
    if (!iso) return null
    const isDateOnly = !iso.includes('T')
    const d = isDateOnly
      ? (() => {
          const [y, m, day] = iso.split('-').map(Number)
          return new Date(y, (m ?? 1) - 1, day ?? 1)
        })()
      : new Date(iso)
    if (isNaN(d.getTime())) return null
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (isDateOnly) return dateStr
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0
    if (hasTime) {
      const timeStr = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      return `${dateStr} at ${timeStr}`
    }
    return dateStr
  }
  const formatDate = formatDueDate ?? defaultFormatDueDate
  const dateDisplay = formatDate(task.due_date ?? task.start_date)
  const isRecurring = Boolean(task.recurrence_pattern)
  const priority: TaskPriority = task.priority ?? 'medium'
  const tagDisplay = task.tags?.[0] ?? null

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
      {/* Top row: status circle and task name */}
      <div className="flex items-center gap-2">
        {/* Status circle */}
        <div className="shrink-0">
          <TaskStatusIndicator status={displayStatus} />
        </div>
        {/* Task name */}
        <span className="text-sm font-medium text-bonsai-slate-800 truncate flex-1">
          {task.title}
        </span>
        {/* Remove button */}
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
      {/* Bottom row: tag, dependency, start/due date, and flag */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-bonsai-slate-600">
        {/* Tag: show first tag if available */}
        {tagDisplay && (
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
              tagDisplay.color === 'mint'
                ? 'bg-emerald-100 text-emerald-800'
                : tagDisplay.color === 'blue'
                  ? 'bg-blue-100 text-blue-800'
                  : tagDisplay.color === 'lavender'
                    ? 'bg-violet-100 text-violet-800'
                    : tagDisplay.color === 'yellow'
                      ? 'bg-amber-100 text-amber-800'
                      : tagDisplay.color === 'periwinkle'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-bonsai-slate-100 text-bonsai-slate-700'
            }`}
          >
            {tagDisplay.name}
          </span>
        )}
        {/* Dependency icons: blocked and blocking */}
        {(isBlocked || isBlocking) && (
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Blocked icon */}
            {isBlocked && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDependencyClick?.()
                }}
                className="shrink-0 text-bonsai-slate-500 hover:text-bonsai-slate-700 rounded p-0.5"
                aria-label="This task is blocked"
              >
                <BlockedIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Blocking icon */}
            {isBlocking && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDependencyClick?.()
                }}
                className="shrink-0 text-amber-500 hover:text-amber-600 rounded p-0.5"
                aria-label="This task is blocking"
              >
                <WarningIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        {/* Start/due date */}
        {dateDisplay && (
          <span className="flex items-center gap-1 text-bonsai-slate-600 shrink-0 min-w-0 max-w-full">
            {isRecurring ? (
              <RepeatIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
            ) : (
              <CalendarIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
            )}
            <span className="truncate">{dateDisplay}</span>
          </span>
        )}
        {/* Priority flag */}
        <span className={`shrink-0 ${getPriorityFlagClasses(priority)}`}>
          <FlagIcon className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  )
}
