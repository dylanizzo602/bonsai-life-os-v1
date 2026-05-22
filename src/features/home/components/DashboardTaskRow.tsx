/* DashboardTaskRow: Two-line task row for the home upcoming-tasks bento card */

import { MaterialIcon } from '../../../components/MaterialIcon'
import { FlagIcon } from '../../../components/icons'
import { TruncatedText } from '../../../components/TruncatedText'
import {
  formatDashboardStartDueRange,
  getDueStatus,
} from '../../tasks/utils/date'
import { getPriorityFlagClasses } from '../../tasks/utils/priority'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
import type { Task, TaskPriority } from '../../tasks/types'
import {
  getTaskDisplayStatus,
  getTaskStatusAriaLabel,
  TaskStatusIndicator,
} from '../../tasks/TaskStatusIndicator'

export interface DashboardTaskRowProps {
  task: Task
  onClick?: () => void
  onToggleComplete?: (taskId: string) => void
}

/** Screen reader label for priority flag (icon-only in metadata) */
function getPriorityAriaLabel(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    none: 'No priority',
    low: 'Low priority',
    medium: 'Normal priority',
    high: 'High priority',
    urgent: 'Urgent priority',
  }
  return map[priority] ?? 'Priority'
}

/** Tag or category label for metadata */
function getTaskTagLabel(task: Task): string | null {
  const tag = task.tags[0]?.name?.trim()
  if (tag) return tag
  const category = task.category?.trim()
  return category || null
}

type MetaSegment =
  | { kind: 'text'; text: string; emphasizeDate?: boolean }
  | { kind: 'priority' }

/** Status control size — matches Upcoming Tasks card header icon (24px / text-[24px]) */
const DASHBOARD_STATUS_SIZE_PX = 24
const dashboardStatusSizeClass = 'h-6 w-6'

/**
 * Bonsai dashboard row: status icon, title, then metadata (tag • dates • priority flag).
 */
export function DashboardTaskRow({ task, onClick, onToggleComplete }: DashboardTaskRowProps) {
  const timeZone = useUserTimeZone()
  const displayStatus = getTaskDisplayStatus(task.status)
  const complete = displayStatus === 'complete'

  const dateRange = formatDashboardStartDueRange(task.start_date, task.due_date, timeZone)
  const dueStatus = getDueStatus(task.due_date, timeZone)
  const dateColorClass =
    dueStatus === 'overdue'
      ? 'text-error'
      : dueStatus === 'dueSoon'
        ? 'text-amber-600'
        : 'text-on-surface-variant'

  /* Metadata segments: tag (if any), start–due, priority flag (if not none) */
  const metaSegments: MetaSegment[] = []
  const tagLabel = getTaskTagLabel(task)
  if (tagLabel) metaSegments.push({ kind: 'text', text: tagLabel })
  if (dateRange) metaSegments.push({ kind: 'text', text: dateRange, emphasizeDate: true })
  if (task.priority !== 'none') metaSegments.push({ kind: 'priority' })

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
      className="group flex cursor-pointer items-start gap-4 rounded-xl border border-transparent px-1 py-3 transition-colors hover:border-surface-variant hover:bg-surface-container-lowest"
    >
      {/* Status control */}
      <button
        type="button"
        onClick={handleCircleClick}
        className={`mt-0.5 flex ${dashboardStatusSizeClass} shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:cursor-default`}
        aria-label={
          complete ? getTaskStatusAriaLabel(displayStatus) : 'Mark task complete'
        }
        disabled={complete || !onToggleComplete}
      >
        {complete ? (
          <span
            className={`flex ${dashboardStatusSizeClass} items-center justify-center rounded-full bg-primary text-on-primary`}
          >
            <MaterialIcon name="check" className="text-[15px]" />
          </span>
        ) : displayStatus === 'in_progress' ? (
          <TaskStatusIndicator status={displayStatus} size={DASHBOARD_STATUS_SIZE_PX} />
        ) : (
          <span
            className={`flex ${dashboardStatusSizeClass} items-center justify-center rounded-full border-2 border-outline-variant transition-colors group-hover:border-primary`}
          />
        )}
      </button>

      {/* Title + metadata */}
      <div className="min-w-0 flex-1">
        <TruncatedText
          fullText={task.title}
          tooltipPosition="top"
          className={`text-body font-semibold leading-snug ${
            complete ? 'text-on-surface-variant line-through' : 'text-on-surface'
          }`}
        >
          {task.title}
        </TruncatedText>

        {metaSegments.length > 0 ? (
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-secondary leading-snug">
            {metaSegments.map((segment, index) => (
              <span key={index} className="inline-flex items-center gap-1.5">
                {index > 0 ? (
                  <span className="text-outline-variant/70" aria-hidden>
                    •
                  </span>
                ) : null}
                {segment.kind === 'priority' ? (
                  <span
                    className="inline-flex"
                    role="img"
                    aria-label={getPriorityAriaLabel(task.priority)}
                  >
                    <FlagIcon
                      className={`h-3.5 w-3.5 shrink-0 ${getPriorityFlagClasses(task.priority)}`}
                      aria-hidden
                    />
                  </span>
                ) : segment.emphasizeDate ? (
                  <span className={dateColorClass}>{segment.text}</span>
                ) : (
                  <span className="text-on-surface-variant">{segment.text}</span>
                )}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  )
}
