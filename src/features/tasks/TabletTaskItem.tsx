/* TabletTaskItem component: Reusable tablet task display with consistent icon layout.
 * Tablet task items never use hover tooltips; icons are display-only for touch and small screens. */

import {
  ChecklistIcon,
  CalendarIcon,
  UsersIcon,
  BlockedIcon,
  WarningIcon,
  ParagraphIcon,
  HourglassIcon,
  RepeatIcon,
  FlagIcon,
} from '../../components/icons'
import { InlineTitleInput } from '../../components/InlineTitleInput'
import { TimeEstimateTooltip } from './modals/TimeEstimateTooltip'
import { isOverdue } from './utils/date'
import type { Task, TaskPriority, TaskStatus } from './types'

/** Display status for the status circle: OPEN, IN PROGRESS, COMPLETE (maps from TaskStatus) */
type DisplayStatus = 'open' | 'in_progress' | 'complete'

export interface TabletTaskItemProps {
  /** Task data to display */
  task: Task
  /** Checklist completed/total when task has checklists */
  checklistSummary?: { completed: number; total: number }
  /** Total time in minutes (task estimate + sum of subtask estimates) for tooltip display */
  totalTimeWithSubtasks?: number | null
  /** Task is blocked by another (show blocked icon) */
  isBlocked?: boolean
  /** Task is blocking another (show warning icon) */
  isBlocking?: boolean
  /** Number of tasks this task is blocking (display only; no tooltips in tablet view) */
  blockingCount?: number
  /** Number of tasks blocking this task (display only; no tooltips in tablet view) */
  blockedByCount?: number
  /** Task is shared with another user (show shared icon) */
  isShared?: boolean
  /** Optional click handler for the entire item */
  onClick?: () => void
  /** Optional right-click context menu (e.g. show task options popover) */
  onContextMenu?: (e: React.MouseEvent) => void
  /** When set, show inline text input to edit task title (Rename from context menu) */
  inlineEditTitle?: {
    value: string
    onSave: (newTitle: string) => void | Promise<void>
    onCancel: () => void
  }
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
 * Tablet task item component with standardized two-row layout.
 * No hover tooltips; safe for tablet and mobile breakpoints.
 * Top row: status circle and task name.
 * Bottom row: all icons and metadata in same order as FullTaskItem:
 * dependency icons, description, checklist, tags, shared, time estimate, date/time, priority.
 * Used in modals, dependency sections, and task lists on tablet/mobile.
 */
export function TabletTaskItem({
  task,
  checklistSummary,
  totalTimeWithSubtasks,
  isBlocked = false,
  isBlocking = false,
  blockingCount: _blockingCount = 0,
  blockedByCount: _blockedByCount = 0,
  isShared = false,
  onClick,
  onContextMenu,
  inlineEditTitle,
  onRemove,
  onDependencyClick,
  formatDueDate,
}: TabletTaskItemProps) {
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
  const isDueOverdue = Boolean(task.due_date && isOverdue(task.due_date))
  const isRecurring = Boolean(task.recurrence_pattern)
  const priority: TaskPriority = task.priority ?? 'medium'

  return (
    <div
      className="tablet-task-item rounded-lg border border-dashed border-amber-200 bg-white px-3 py-2 shadow-sm"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onContextMenu={onContextMenu}
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
        {/* Task name: or inline edit input when renaming */}
        {inlineEditTitle ? (
          <InlineTitleInput
            value={inlineEditTitle.value}
            onSave={inlineEditTitle.onSave}
            onCancel={inlineEditTitle.onCancel}
            className="min-w-0 flex-1 text-sm font-medium text-bonsai-slate-800 border border-bonsai-sage-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500"
          />
        ) : (
          <span className="text-sm font-medium text-bonsai-slate-800 truncate flex-1">
            {task.title}
          </span>
        )}
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
      {/* Bottom row: all icons and metadata on a single row (horizontal scroll if needed) */}
      <div className="mt-2 flex flex-nowrap items-center gap-2 overflow-x-auto text-xs text-bonsai-slate-600">
        {/* Dependency icons: blocked and blocking icons immediately after task name */}
        {(isBlocked || isBlocking) && (
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Blocked icon: No tooltip in tablet view */}
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
            {/* Blocking icon: No tooltip in tablet view */}
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
        {/* Description icon: No tooltip in tablet view */}
        {task.description?.trim() && (
          <span className="shrink-0 text-bonsai-slate-500">
            <ParagraphIcon className="w-3.5 h-3.5" />
          </span>
        )}
        {/* Checklist indicator */}
        {checklistSummary && checklistSummary.total > 0 && (
          <span className="flex shrink-0 items-center gap-0.5 text-bonsai-slate-600">
            <ChecklistIcon className="w-3.5 h-3.5" />
            <span>
              {checklistSummary.completed}/{checklistSummary.total}
            </span>
          </span>
        )}
        {/* Tags: Show up to 3 tags like FullTaskItem */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex shrink-0 items-center gap-1">
            {task.tags.slice(0, 3).map((t) => (
              <span
                key={t.id}
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  t.color === 'mint'
                    ? 'bg-emerald-100 text-emerald-800'
                    : t.color === 'blue'
                      ? 'bg-blue-100 text-blue-800'
                      : t.color === 'lavender'
                        ? 'bg-violet-100 text-violet-800'
                        : t.color === 'yellow'
                          ? 'bg-amber-100 text-amber-800'
                          : t.color === 'periwinkle'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-bonsai-slate-100 text-bonsai-slate-700'
                }`}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
        {/* Shared icon */}
        {isShared && (
          <span className="shrink-0 text-bonsai-slate-500">
            <UsersIcon className="w-3.5 h-3.5" />
          </span>
        )}
        {/* Time estimate: Tooltip on hover with estimate and total with subtasks */}
        {task.time_estimate != null && task.time_estimate > 0 && (
          <TimeEstimateTooltip minutes={task.time_estimate} totalWithSubtasks={totalTimeWithSubtasks} position="top">
            <span className="flex items-center gap-1 text-bonsai-slate-600">
              <HourglassIcon className="w-3.5 h-3.5" aria-hidden />
              {task.time_estimate < 60
                ? `${task.time_estimate}m`
                : `${Math.floor(task.time_estimate / 60)}h${task.time_estimate % 60 ? ` ${task.time_estimate % 60}m` : ''}`}
            </span>
          </TimeEstimateTooltip>
        )}
        {/* Date/time or repeat icon */}
        {dateDisplay && (
          <span className={`flex items-center gap-1 shrink-0 min-w-0 max-w-full ${isDueOverdue ? 'text-red-600 font-medium' : 'text-bonsai-slate-600'}`}>
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
