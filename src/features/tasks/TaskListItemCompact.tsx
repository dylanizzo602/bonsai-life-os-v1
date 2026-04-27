/* TaskListItemCompact: Dense two-row task row for mobile viewports and narrow widgets */

import { useState, useRef } from 'react'
import {
  CalendarIcon,
  BlockedIcon,
  WarningIcon,
  RepeatIcon,
  FlagIcon,
  TrophyIcon,
  ChevronDownIcon,
  HourglassIcon,
  ParagraphIcon,
  TasksIcon,
  ChecklistIcon,
} from '../../components/icons'
import { InlineTitleInput } from '../../components/InlineTitleInput'
import { Tooltip } from '../../components/Tooltip'
import { PriorityPickerModal } from './modals/PriorityPickerModal'
import { parseRecurrencePattern, formatRecurrenceForTooltip } from '../../lib/recurrence'
import { getDueStatus, formatStartDueDisplay } from './utils/date'
import { useUserTimeZone } from '../settings/useUserTimeZone'
import type { TaskListItemProps } from './taskListItemTypes'
import type { TaskPriority, TaskStatus } from './types'

/** Display status for the status circle: OPEN, IN PROGRESS, COMPLETE (maps from TaskStatus) */
type DisplayStatus = 'open' | 'in_progress' | 'complete'

/** Map TaskStatus to display status for the status circle */
function getDisplayStatus(status: TaskStatus): DisplayStatus {
  if (status === 'completed') return 'complete'
  if (status === 'in_progress') return 'in_progress'
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
 * Compact task row: minimal two-row layout for small screens and sidebars.
 */
export function TaskListItemCompactLayout({
  task,
  parentTaskTitle = null,
  hasSubtasks = false,
  subtaskCount,
  incompleteSubtaskCount = 0,
  expanded = false,
  onToggleExpand,
  isBlocked = false,
  isBlocking = false,
  checklistSummary,
  onClick,
  onContextMenu,
  inlineEditTitle,
  onRemove,
  onDependencyClick,
  formatDueDate: _formatDueDate,
  onUpdateTask,
}: TaskListItemProps) {
  const timeZone = useUserTimeZone()
  const displayStatus = getDisplayStatus(task.status)
  /* Date display: single line for start/due (Starts Jan 1, Due Jan 3 at 5pm, Jan 1 - Jan 3 at 5pm, etc.) */
  const dateDisplay = formatStartDueDisplay(task.start_date, task.due_date, timeZone)
  const dueStatus = getDueStatus(task.due_date, timeZone)
  const isDueOverdue = dueStatus === 'overdue'
  const isDueSoon = dueStatus === 'dueSoon'
  const isRecurring = Boolean(task.recurrence_pattern)
  const priority: TaskPriority = task.priority ?? 'medium'
  /* Priority picker state: matches tablet/desktop task rows */
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false)
  const priorityButtonRef = useRef<HTMLButtonElement>(null)
  const tagDisplay = task.tags?.[0] ?? null
  /* Tag pill class by color (mint, blue, lavender, yellow, periwinkle, default) */
  const tagPillClass = tagDisplay
    ? tagDisplay.color === 'mint'
      ? 'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800'
      : tagDisplay.color === 'blue'
        ? 'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800'
        : tagDisplay.color === 'lavender'
          ? 'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-violet-100 text-violet-800'
          : tagDisplay.color === 'yellow'
            ? 'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800'
            : tagDisplay.color === 'periwinkle'
              ? 'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800'
              : 'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-bonsai-slate-100 text-bonsai-slate-700'
    : ''

  /* Subtask display: show completed/total when total is available (matches checklist "x/y") */
  const subtaskSummary =
    hasSubtasks && (subtaskCount ?? 0) > 0
      ? `${Math.max(0, (subtaskCount ?? 0) - incompleteSubtaskCount)}/${subtaskCount}`
      : null

  /* Priority flag: same interactive pattern as other TaskListItem layouts when onUpdateTask is set */
  const priorityControl = onUpdateTask ? (
    <button
      ref={priorityButtonRef}
      type="button"
      data-task-interactive
      onClick={(e) => {
        e.stopPropagation()
        setIsPriorityModalOpen(true)
      }}
      className={`ml-1 shrink-0 inline-flex items-center justify-center rounded p-0.5 transition-colors hover:bg-bonsai-slate-100 disabled:cursor-default disabled:hover:bg-transparent ${
        task.goal_id
          ? 'stroke-yellow-500 fill-yellow-100 text-yellow-600'
          : getPriorityFlagClasses(priority)
      }`}
      aria-label={task.goal_id ? 'Edit priority (linked to goal)' : 'Edit priority'}
    >
      {task.goal_id ? (
        <TrophyIcon className="w-3.5 h-3.5" />
      ) : (
        <FlagIcon className="w-3.5 h-3.5" />
      )}
    </button>
  ) : (
    <span
      className={`ml-1 shrink-0 inline-flex ${
        task.goal_id
          ? 'stroke-yellow-500 fill-yellow-100 text-yellow-600'
          : getPriorityFlagClasses(priority)
      }`}
    >
      {task.goal_id ? (
        <TrophyIcon className="w-3.5 h-3.5" />
      ) : (
        <FlagIcon className="w-3.5 h-3.5" />
      )}
    </span>
  )

  return (
    <div
      className="compact-task-item rounded-lg border border-dashed border-bonsai-slate-200 bg-white px-3 py-2 shadow-sm"
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
      {/* Top row: chevron (when expand/collapse is supported), status circle, and task name */}
      <div className="flex items-center gap-2">
        {/* Chevron: show whenever onToggleExpand is provided; click toggles expand without opening edit */}
        {onToggleExpand && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand?.()
            }}
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded text-bonsai-slate-600 hover:bg-bonsai-slate-100 hover:text-bonsai-slate-800 transition-colors"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse subtasks' : hasSubtasks ? 'Expand subtasks' : 'Show subtasks'}
          >
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
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
        {/* Subtask indicator: compact badge with tooltip for parent context */}
        {task.parent_id && (
          <Tooltip
            content={`Subtask of ${parentTaskTitle ?? 'parent task'}`}
            position="top"
            size="sm"
          >
            <span className="shrink-0 rounded-md border border-bonsai-slate-200 bg-bonsai-slate-50 px-2 py-0.5 text-xs text-bonsai-slate-600">
              Subtask
            </span>
          </Tooltip>
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
      {/* Bottom row: all icons and metadata in a single horizontal row, with horizontal scroll when needed */}
      <div className="mt-2 flex min-w-0 flex-nowrap items-center gap-1 text-xs text-bonsai-slate-600 overflow-x-auto">
        {/* Tag: show first tag if available; shrink-0 so row stays single line */}
        {(tagDisplay != null ? <span className={tagPillClass}>{tagDisplay.name}</span> : null)}
        {/* Subtasks indicator: completed/total when available, otherwise falls back to incomplete count */}
        {hasSubtasks && (
          <span className="flex shrink-0 items-center gap-0.5 text-bonsai-slate-600">
            <TasksIcon className="w-3.5 h-3.5" aria-hidden />
            <span>{subtaskSummary ?? incompleteSubtaskCount}</span>
          </span>
        )}
        {/* Description icon when task has description (consistent with main task list) */}
        {task.description?.trim() ? (
          <span className="shrink-0 text-bonsai-slate-500" aria-label="Has description">
            <ParagraphIcon className="w-3.5 h-3.5" />
          </span>
        ) : null}
        {/* Checklist indicator: compact count of completed/total checklist items when present */}
        {checklistSummary && checklistSummary.total > 0 && (
          <span className="flex shrink-0 items-center gap-0.5 text-bonsai-slate-600">
            <ChecklistIcon className="w-3.5 h-3.5" aria-hidden />
            <span>
              {checklistSummary.completed}/{checklistSummary.total}
            </span>
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
        {/* Time estimate: hourglass icon + formatted duration (e.g. 5m, 1h 30m) */}
        {task.time_estimate != null && task.time_estimate > 0 && (
          <span className="flex items-center gap-1 text-bonsai-slate-600 shrink-0">
            <HourglassIcon className="w-3.5 h-3.5" aria-hidden />
            {task.time_estimate < 60
              ? `${task.time_estimate}m`
              : `${Math.floor(task.time_estimate / 60)}h${task.time_estimate % 60 ? ` ${task.time_estimate % 60}m` : ''}`}
          </span>
        )}
        {/* Start/due date and priority: keep date+flag grouped when a date exists, but always render priority so subtasks match main task icons */}
        {dateDisplay
          ? isRecurring ? (
              <Tooltip
                content={
                  <span className="text-secondary text-bonsai-slate-800">
                    {formatRecurrenceForTooltip(parseRecurrencePattern(task.recurrence_pattern))}
                  </span>
                }
                position="top"
                size="sm"
              >
                <span
                  className={`flex items-center gap-1 shrink-0 min-w-0 max-w-full ${
                    isDueOverdue
                      ? 'text-red-600 font-medium'
                      : isDueSoon
                        ? 'text-amber-600 font-medium'
                        : 'text-bonsai-slate-600'
                  }`}
                >
                  <RepeatIcon className="w-3.5 h-3.5 shrink-0 text-bonsai-slate-500" aria-hidden />
                  <CalendarIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{dateDisplay}</span>
                  {priorityControl}
                </span>
              </Tooltip>
            ) : (
              <span
                className={`flex items-center gap-1 shrink-0 min-w-0 max-w-full ${
                  isDueOverdue
                    ? 'text-red-600 font-medium'
                    : isDueSoon
                      ? 'text-amber-600 font-medium'
                      : 'text-bonsai-slate-600'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span className="truncate">{dateDisplay}</span>
                {priorityControl}
              </span>
            )
          : (
            priorityControl
          )}
      </div>
      {/* Priority popover: same modal as other breakpoints when onUpdateTask is set */}
      {onUpdateTask && (
        <PriorityPickerModal
          isOpen={isPriorityModalOpen}
          onClose={() => setIsPriorityModalOpen(false)}
          value={priority}
          triggerRef={priorityButtonRef}
          onSelect={async (newPriority) => {
            try {
              await onUpdateTask(task.id, { priority: newPriority })
            } catch (error) {
              console.error('Failed to update priority (compact):', error)
            }
          }}
        />
      )}
    </div>
  )
}
