/* FullTaskItem component: Desktop full-width task row with left/right metadata */

import { useRef, useEffect, useState } from 'react'
import {
  ChevronDownIcon,
  CalendarIcon,
  FlagIcon,
  ParagraphIcon,
  ChecklistIcon,
  BlockedIcon,
  WarningIcon,
  UsersIcon,
  RepeatIcon,
  HourglassIcon,
} from '../../components/icons'
import { TaskNameHover } from './TaskNameHover'
import type { Task, TaskPriority, TaskStatus } from './types'

/** Display status for the status circle: OPEN, IN PROGRESS, COMPLETE (maps from TaskStatus) */
type DisplayStatus = 'open' | 'in_progress' | 'complete'

export interface FullTaskItemProps {
  /** Task data to display */
  task: Task
  /** Whether this task has subtasks (shows chevron and allows expand) */
  hasSubtasks?: boolean
  /** Checklist completed/total when task has checklists */
  checklistSummary?: { completed: number; total: number }
  /** Task is blocked by another (show blocked icon) */
  isBlocked?: boolean
  /** Task is blocking another (show warning icon) */
  isBlocking?: boolean
  /** Task is shared with another user (show two-person icon) */
  isShared?: boolean
  /** Whether subtask section is expanded */
  expanded?: boolean
  /** Toggle expand/collapse when chevron is clicked */
  onToggleExpand?: () => void
  /** Optional click on the row (e.g. open edit) */
  onClick?: () => void
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

/** Format due_date or start_date as "Jan 22 at 3:00pm" or "Jan 22" when no time */
function formatDateWithOptionalTime(isoString: string | null): string | null {
  if (!isoString) return null
  const d = new Date(isoString)
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
 * Full task item for desktop task section: single full-width row with left-aligned
 * metadata (chevron, status, title, description/checklist/tag/blocked/blocking/shared)
 * and right-aligned priority, date/time, and recurrence.
 */
export function FullTaskItem({
  task,
  hasSubtasks = false,
  checklistSummary,
  isBlocked = false,
  isBlocking = false,
  isShared = false,
  expanded = false,
  onToggleExpand,
  onClick,
}: FullTaskItemProps) {
  const displayStatus = getDisplayStatus(task.status)
  const dateDisplay = formatDateWithOptionalTime(task.due_date) ?? formatDateWithOptionalTime(task.start_date)
  const isRecurring = Boolean(task.recurrence_pattern)
  /* medium = "normal" for display; ensure priority is valid for flag classes */
  const priority: TaskPriority = task.priority ?? 'medium'

  /* Refs: Measure container, right section, and left icons to calculate available width for task name */
  const containerRef = useRef<HTMLDivElement>(null)
  const rightSectionRef = useRef<HTMLDivElement>(null)
  const leftIconsBeforeRef = useRef<HTMLDivElement>(null)
  const leftIconsAfterRef = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState<number | undefined>(undefined)

  /* Calculate available width: Container width - right section - left icons before - left icons after - gaps */
  useEffect(() => {
    const calculateAvailableWidth = () => {
      if (!containerRef.current || !rightSectionRef.current || !leftIconsBeforeRef.current || !leftIconsAfterRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const rightRect = rightSectionRef.current.getBoundingClientRect()
      const leftIconsBeforeRect = leftIconsBeforeRef.current.getBoundingClientRect()
      const leftIconsAfterRect = leftIconsAfterRef.current.getBoundingClientRect()
      
      /* Calculate: container width - right section - left icons before - left icons after - gaps */
      const containerWidth = containerRect.width
      const rightWidth = rightRect.width
      const leftIconsBeforeWidth = leftIconsBeforeRect.width
      const leftIconsAfterWidth = leftIconsAfterRect.width
      const gapBetweenSections = 16 // gap-4 = 16px between left and right sections
      const gapInLeftSection = 8 // gap-2 = 8px between items in left section
      const padding = 32 // px-4 = 16px on each side
      
      /* Available width = container - right - left icons before - left icons after - gaps - padding */
      const available = containerWidth - rightWidth - leftIconsBeforeWidth - leftIconsAfterWidth - gapBetweenSections - (gapInLeftSection * 2) - padding
      
      /* Only set if positive, otherwise let it be undefined to use default behavior */
      setAvailableWidth(available > 0 ? Math.floor(available) : undefined)
    }

    /* Initial calculation with a small delay to ensure DOM is ready */
    const timeoutId = setTimeout(calculateAvailableWidth, 0)

    /* Use ResizeObserver to recalculate when sizes change */
    const resizeObserver = new ResizeObserver(() => {
      calculateAvailableWidth()
    })

    if (containerRef.current) resizeObserver.observe(containerRef.current)
    if (rightSectionRef.current) resizeObserver.observe(rightSectionRef.current)
    if (leftIconsBeforeRef.current) resizeObserver.observe(leftIconsBeforeRef.current)
    if (leftIconsAfterRef.current) resizeObserver.observe(leftIconsAfterRef.current)

    /* Also listen to window resize */
    window.addEventListener('resize', calculateAvailableWidth)

    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', calculateAvailableWidth)
    }
  }, [hasSubtasks, checklistSummary, task.tag, isBlocked, isBlocking, isShared, task.description, task.time_estimate, dateDisplay])

  return (
    <div
      ref={containerRef}
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
      className="flex items-center justify-between gap-4 rounded-lg border border-bonsai-slate-200 bg-white px-4 py-3 transition-colors hover:bg-bonsai-slate-50"
    >
      {/* Left section: chevron, status, task name, then other icons (description, checklist, tag, blocked, blocking, shared) */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* Left icons before task name: Chevron and status circle */}
        <div ref={leftIconsBeforeRef} className="flex shrink-0 items-center gap-2">
          {/* Chevron: show when task has subtasks */}
          {hasSubtasks && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand?.()
              }}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded text-bonsai-slate-600 hover:bg-bonsai-slate-100 hover:text-bonsai-slate-800 transition-colors"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
              title={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
            >
              <ChevronDownIcon
                className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          )}
          <TaskStatusIndicator status={displayStatus} />
        </div>
        
        {/* Task name: Appears after status circle, before other icons */}
        <TaskNameHover 
          title={task.title} 
          status={task.status} 
          maxWidth={availableWidth}
        />
        
        {/* Left icons after task name: Description, checklist, tag, blocked, blocking, shared */}
        <div ref={leftIconsAfterRef} className="flex shrink-0 items-center gap-2">
          {/* Description icon */}
          {task.description?.trim() && (
            <span className="shrink-0 text-bonsai-slate-500" title="Has description">
              <ParagraphIcon className="w-4 h-4 md:w-5 md:h-5" />
            </span>
          )}
          {/* Checklist indicator */}
          {checklistSummary && checklistSummary.total > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-bonsai-slate-600" title="Checklist">
              <ChecklistIcon className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm">
                {checklistSummary.completed}/{checklistSummary.total}
              </span>
            </span>
          )}
          {/* Tag */}
          {task.tag && (
            <span className="shrink-0 rounded bg-bonsai-slate-100 px-2 py-0.5 text-xs font-medium text-bonsai-slate-700">
              {task.tag}
            </span>
          )}
          {/* Blocked icon */}
          {isBlocked && (
            <span className="shrink-0 text-bonsai-slate-500" title="Blocked by another task">
              <BlockedIcon className="w-4 h-4 md:w-5 md:h-5" />
            </span>
          )}
          {/* Blocking icon */}
          {isBlocking && (
            <span className="shrink-0 text-amber-500" title="Blocking another task">
              <WarningIcon className="w-4 h-4 md:w-5 md:h-5" />
            </span>
          )}
          {/* Shared icon */}
          {isShared && (
            <span className="shrink-0 text-bonsai-slate-500" title="Shared with others">
              <UsersIcon className="w-4 h-4 md:w-5 md:h-5" />
            </span>
          )}
        </div>
      </div>

      {/* Right section: time estimate, date/time or repeat icon, priority flag */}
      <div ref={rightSectionRef} className="flex shrink-0 items-center gap-2">
        {task.time_estimate != null && task.time_estimate > 0 && (
          <span className="flex items-center gap-1 text-sm text-bonsai-slate-600" title="Time estimate">
            <HourglassIcon className="w-4 h-4 md:w-5 md:h-5" aria-hidden />
            {task.time_estimate < 60
              ? `${task.time_estimate}m`
              : `${Math.floor(task.time_estimate / 60)}h${task.time_estimate % 60 ? ` ${task.time_estimate % 60}m` : ''}`}
          </span>
        )}
        {dateDisplay && (
          <span className="flex items-center gap-1 text-sm text-bonsai-slate-600">
            {isRecurring ? (
              <RepeatIcon className="w-4 h-4 md:w-5 md:h-5" aria-hidden />
            ) : (
              <CalendarIcon className="w-4 h-4 md:w-5 md:h-5" aria-hidden />
            )}
            {dateDisplay}
          </span>
        )}
        <span
          className={getPriorityFlagClasses(priority)}
          title={`Priority: ${priority}`}
          aria-hidden
        >
          <FlagIcon className="w-4 h-4 md:w-5 md:h-5" />
        </span>
      </div>
    </div>
  )
}
