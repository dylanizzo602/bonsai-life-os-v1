/* DashboardTaskRow: Two-line task row for the home upcoming-tasks bento card */

import { MaterialIcon } from '../../../components/MaterialIcon'
import { TruncatedText } from '../../../components/TruncatedText'
import { PriorityFlagIcon } from '../../tasks/components/PriorityFlagIcon'
import {
  formatStartDueDisplay,
  getDueStatus,
} from '../../tasks/utils/date'
import {
  getLineupTagPillClassName,
  getTagPillClasses,
} from '../../tasks/utils/tagPillStyles'
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

type MetaSegment =
  | { kind: 'tag'; label: string; className: string }
  | { kind: 'text'; text: string; emphasizeDate?: boolean }
  | { kind: 'priority' }

/** Tag pill classes for metadata — matches Today's Lineup card pills */
function getDashboardTagPillClassName(task: Task): { label: string; className: string } | null {
  const primaryTag = task.tags[0]
  if (primaryTag?.name?.trim()) {
    return { label: primaryTag.name, className: getLineupTagPillClassName(primaryTag) }
  }
  const category = task.category?.trim()
  if (!category) return null
  return {
    label: category,
    className: `shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${getTagPillClasses('slate')}`,
  }
}

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

  /* Dates: show separate start and due labels so both are visible when set */
  const startLabel = formatStartDueDisplay(task.start_date, null, timeZone)
  const dueLabel = formatStartDueDisplay(null, task.due_date, timeZone)
  const dueStatus = getDueStatus(task.due_date, timeZone)
  const dateColorClass =
    dueStatus === 'overdue'
      ? 'text-error'
      : dueStatus === 'dueSoon'
        ? 'text-amber-600'
        : 'text-on-surface-variant'

  /* Metadata segments: tag pill (if any), start label, due label, priority flag (if not none) */
  const metaSegments: MetaSegment[] = []
  const tagPill = getDashboardTagPillClassName(task)
  if (tagPill) metaSegments.push({ kind: 'tag', label: tagPill.label, className: tagPill.className })
  if (startLabel) metaSegments.push({ kind: 'text', text: startLabel })
  if (dueLabel) metaSegments.push({ kind: 'text', text: dueLabel, emphasizeDate: true })
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
      className="group flex cursor-pointer items-center gap-4 rounded-xl border border-transparent px-1 py-3 transition-colors hover:border-surface-variant hover:bg-surface-container-lowest"
    >
      {/* Status control */}
      <button
        type="button"
        onClick={handleCircleClick}
        className={`flex ${dashboardStatusSizeClass} shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:cursor-default`}
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
                {segment.kind === 'tag' ? (
                  <span className={segment.className}>{segment.label}</span>
                ) : segment.kind === 'priority' ? (
                  <span
                    className="inline-flex"
                    role="img"
                    aria-label={getPriorityAriaLabel(task.priority)}
                  >
                    <PriorityFlagIcon priority={task.priority} className="text-sm" />
                  </span>
                ) : (
                  <span className={segment.emphasizeDate ? dateColorClass : 'text-on-surface-variant'}>
                    {segment.text}
                  </span>
                )}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  )
}
