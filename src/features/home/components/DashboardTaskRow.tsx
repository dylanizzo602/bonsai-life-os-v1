/* DashboardTaskRow: Single task row for the home upcoming-tasks bento card */

import { ChecklistIcon, FlagIcon, RepeatIcon, TasksIcon } from '../../../components/icons'
import { TruncatedText } from '../../../components/TruncatedText'
import { getDueStatus, formatStartDueDisplay } from '../../tasks/utils/date'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
import type { Task } from '../../tasks/types'
import {
  getTaskDisplayStatus,
  getTaskStatusAriaLabel,
  TaskStatusIndicator,
} from '../../tasks/TaskStatusIndicator'
import { getPriorityFlagClasses } from '../../tasks/utils/priority'

export interface DashboardTaskRowProps {
  task: Task
  /** Subtask progress e.g. "3/5" */
  subtaskSummary?: string | null
  /** Checklist item progress when the task has checklists */
  checklistSummary?: { completed: number; total: number } | null
  onClick?: () => void
  onToggleComplete?: (taskId: string) => void
}

/**
 * Dashboard-styled task row with checkbox, tag, subtask/checklist counts, due date, and priority flag.
 */
export function DashboardTaskRow({
  task,
  subtaskSummary,
  checklistSummary,
  onClick,
  onToggleComplete,
}: DashboardTaskRowProps) {
  const timeZone = useUserTimeZone()
  const dueLabel = formatStartDueDisplay(task.due_date, task.start_date, timeZone)
  const dueStatus = getDueStatus(task.due_date, timeZone)
  const dueColor =
    dueStatus === 'overdue'
      ? 'text-error'
      : dueStatus === 'dueSoon'
        ? 'text-amber-600'
        : 'text-on-surface-variant'

  const categoryLabel = task.category?.trim() || task.tags[0]?.name || null
  const displayStatus = getTaskDisplayStatus(task.status)
  const complete = displayStatus === 'complete'
  const hasProgress =
    Boolean(subtaskSummary) ||
    Boolean(checklistSummary && checklistSummary.total > 0)

  const handleCircleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleComplete && !complete) {
      onToggleComplete(task.id)
    }
  }

  return (
    <div
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
      className="group flex cursor-pointer items-center gap-4 rounded-xl border border-transparent p-4 transition-colors hover:border-surface-variant hover:bg-surface-container-lowest"
    >
      {/* Status circle: open / in progress / complete colors match task list */}
      <button
        type="button"
        onClick={handleCircleClick}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80 disabled:cursor-default"
        aria-label={
          complete ? getTaskStatusAriaLabel(displayStatus) : 'Mark task complete'
        }
        disabled={complete || !onToggleComplete}
      >
        <TaskStatusIndicator status={displayStatus} size={24} />
      </button>

      {/* Title, tag, and progress counts */}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex min-w-0 items-center gap-2">
          {/* Title column: flex-1 + overflow-hidden so TruncatedText respects row width */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <TruncatedText
              fullText={task.title}
              tooltipPosition="top"
              className={`text-body font-medium leading-tight ${
                complete ? 'text-on-surface-variant line-through' : 'text-on-surface'
              }`}
            >
              {task.title}
            </TruncatedText>
          </div>
          {task.recurrence_pattern ? (
            <RepeatIcon className="h-4 w-4 shrink-0 text-on-surface-variant/60" aria-hidden />
          ) : null}
        </div>

        {categoryLabel ? (
          <div className="mt-1">
            <span className="inline-block rounded-full bg-surface-container-high px-2 py-0.5 text-xs font-medium text-on-surface-variant">
              {categoryLabel}
            </span>
          </div>
        ) : null}

        {/* Subtask / checklist counts below tag (or below title when no tag) */}
        {hasProgress ? (
          <div
            className={`flex flex-wrap items-center gap-3 text-secondary text-on-surface-variant ${categoryLabel ? 'mt-1.5' : 'mt-1'}`}
          >
            {subtaskSummary ? (
              <span className="inline-flex items-center gap-1">
                <TasksIcon className="h-4 w-4 shrink-0" aria-hidden />
                <span>{subtaskSummary}</span>
              </span>
            ) : null}
            {checklistSummary && checklistSummary.total > 0 ? (
              <span className="inline-flex items-center gap-1">
                <ChecklistIcon className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {checklistSummary.completed}/{checklistSummary.total}
                </span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Due date and priority */}
      <div className="flex shrink-0 items-center gap-3 self-start pt-0.5">
        {dueLabel ? <span className={`text-secondary ${dueColor}`}>{dueLabel}</span> : null}
        <FlagIcon
          className={`h-5 w-5 shrink-0 ${getPriorityFlagClasses(task.priority)}`}
          aria-hidden
        />
      </div>
    </div>
  )
}
