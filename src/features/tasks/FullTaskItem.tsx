/* FullTaskItem component: Desktop full-width task row with left/right metadata */

import { useRef, useEffect, useState } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
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
import { Tooltip } from '../../components/Tooltip'
import { TaskNameHover } from './TaskNameHover'
import { DescriptionTooltip } from '../../components/DescriptionTooltip'
import { DependencyTooltip } from '../../components/DependencyTooltip'
import { StatusPickerModal } from './modals/StatusPickerModal'
import { UnresolvedItemsConfirmModal } from './modals/UnresolvedItemsConfirmModal'
import { TimeEstimateModal } from './modals/TimeEstimateModal'
import { TimeEstimateTooltip } from './modals/TimeEstimateTooltip'
import { PriorityPickerModal } from './modals/PriorityPickerModal'
import { DatePickerModal } from './modals/DatePickerModal'
import { TagModal } from './modals/TagModal'
import { TaskDependenciesPopover } from './modals/TaskDependenciesPopover'
import { TabletTaskItem } from './TabletTaskItem'
import { useTags } from './hooks/useTags'
import { isOverdue } from './utils/date'
import type { Task, TaskPriority, TaskStatus, UpdateTaskInput } from './types'

/** Display status for the status circle: OPEN, IN PROGRESS, COMPLETE (maps from TaskStatus) */
type DisplayStatus = 'open' | 'in_progress' | 'complete'

export interface FullTaskItemProps {
  /** Task data to display */
  task: Task
  /** Whether this task has subtasks (shows chevron and allows expand) */
  hasSubtasks?: boolean
  /** Number of subtasks that are not completed (for unresolved-items confirm modal) */
  incompleteSubtaskCount?: number
  /** Checklist completed/total when task has checklists */
  checklistSummary?: { completed: number; total: number }
  /** Total time in minutes (task estimate + sum of subtask estimates) for tooltip display */
  totalTimeWithSubtasks?: number | null
  /** Task is blocked by another (show blocked icon) */
  isBlocked?: boolean
  /** Task is blocking another (show warning icon) */
  isBlocking?: boolean
  /** Number of tasks this task is blocking (for tooltip) */
  blockingCount?: number
  /** Number of tasks blocking this task (for tooltip) */
  blockedByCount?: number
  /** Task is shared with another user (show two-person icon) */
  isShared?: boolean
  /** Whether subtask section is expanded */
  expanded?: boolean
  /** Toggle expand/collapse when chevron is clicked */
  onToggleExpand?: () => void
  /** Called when user expands to add a subtask (e.g. focus add-subtask input) */
  onExpandForSubtask?: () => void
  /** Optional click on the row (e.g. open edit) */
  onClick?: () => void
  /** Function to update task status */
  onUpdateStatus?: (taskId: string, status: TaskStatus) => Promise<void>
  /** Complete task and mark all subtasks and checklist items complete (for unresolved-items modal) */
  onCompleteTaskAndResolveAll?: (taskId: string) => Promise<void>
  /** Function to update task (for time estimate and other fields) */
  onUpdateTask?: (taskId: string, input: UpdateTaskInput) => Promise<void>
  /** Called after tags are updated (e.g. to refetch task list) */
  onTagsUpdated?: () => void
  /** Whether this is displayed as a tablet task item (e.g. in modals, tablet/mobile views) */
  tablet?: boolean
  /** Fetch all tasks (for dependency popover) */
  getTasks?: () => Promise<import('./types').Task[]>
  /** Fetch task dependencies */
  getTaskDependencies?: (taskId: string) => Promise<{
    blocking: import('./types').TaskDependency[]
    blockedBy: import('./types').TaskDependency[]
  }>
  /** Create a task dependency */
  onAddDependency?: (input: import('./types').CreateTaskDependencyInput) => Promise<void>
  /** Remove a task dependency by id */
  onRemoveDependency?: (dependencyId: string) => Promise<void>
  /** Called when dependencies change (e.g. to refetch enrichment) */
  onDependenciesChanged?: () => void
}

/** Map TaskStatus to display status for the status circle */
function getDisplayStatus(status: TaskStatus): DisplayStatus {
  if (status === 'completed') return 'complete'
  return 'open'
}

/** Map DisplayStatus back to TaskStatus for database updates */
function getTaskStatus(displayStatus: DisplayStatus): TaskStatus {
  if (displayStatus === 'complete') return 'completed'
  return 'active'
}

/** Human-readable label for status circle tooltip */
function getStatusLabel(status: DisplayStatus): string {
  if (status === 'complete') return 'Complete'
  if (status === 'in_progress') return 'In progress'
  return 'Open'
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

/** Format ISO date string as "Jan 1, 2025" for tooltip display. Date-only (YYYY-MM-DD) parsed as local. */
function formatDateForTooltip(isoString: string | null): string | null {
  if (!isoString) return null
  const isDateOnly = !isoString.includes('T')
  const d = isDateOnly
    ? (() => {
        const [y, m, day] = isoString.split('-').map(Number)
        return new Date(y, (m ?? 1) - 1, day ?? 1)
      })()
    : new Date(isoString)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Format due_date or start_date as "Jan 22 at 3:00pm" or "Jan 22" when no time. Date-only (YYYY-MM-DD) parsed as local to avoid timezone shift. */
function formatDateWithOptionalTime(isoString: string | null | undefined): string | null {
  if (isoString == null || isoString === '') return null
  const isDateOnly = !isoString.includes('T')
  const d = isDateOnly
    ? (() => {
        const [y, m, day] = isoString.split('-').map(Number)
        return new Date(y, (m ?? 1) - 1, day ?? 1)
      })()
    : new Date(isoString)
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

/** Human-readable priority label for display next to the flag (full task view) */
function getPriorityLabel(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    none: 'None',
    low: 'Low',
    medium: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  }
  return map[priority] ?? 'None'
}


/**
 * Full task item for desktop task section: single full-width row with left-aligned
 * metadata (chevron, status, title, description/checklist/tag/blocked/blocking/shared)
 * and right-aligned priority, date/time, and recurrence.
 */
export function FullTaskItem({
  task,
  hasSubtasks = false,
  incompleteSubtaskCount = 0,
  checklistSummary,
  totalTimeWithSubtasks,
  isBlocked = false,
  isBlocking = false,
  isShared = false,
  expanded = false,
  onToggleExpand,
  onExpandForSubtask,
  onClick,
  blockingCount = 0,
  blockedByCount = 0,
  onUpdateStatus,
  onCompleteTaskAndResolveAll,
  onUpdateTask,
  onTagsUpdated,
  tablet = false,
  getTasks,
  getTaskDependencies,
  onAddDependency,
  onRemoveDependency,
  onDependenciesChanged,
}: FullTaskItemProps) {
  const displayStatus = getDisplayStatus(task.status)
  /* Modal state: Track whether status picker modal is open */
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  /* Modal state: Track whether unresolved-items confirm modal is open (when completing with open subtasks/checklist) */
  const [isUnresolvedModalOpen, setIsUnresolvedModalOpen] = useState(false)
  /* Modal state: Track whether time estimate modal is open */
  const [isTimeEstimateModalOpen, setIsTimeEstimateModalOpen] = useState(false)
  /* Modal state: Track whether priority picker modal is open */
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false)
  /* Modal state: Track whether date picker modal is open */
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false)
  /* Modal state: Track whether tag modal is open */
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  /* Modal state: Track whether dependencies popover is open */
  const [isDependenciesPopoverOpen, setIsDependenciesPopoverOpen] = useState(false)
  /* Tag button ref: Used to position the tag popover */
  const tagButtonRef = useRef<HTMLButtonElement>(null)
  /* Dependency icons button ref: Used to position the dependencies popover */
  const dependencyIconsButtonRef = useRef<HTMLButtonElement>(null)
  const { searchTags, createTag, updateTag, deleteTagFromAllTasks, setTagsForTask } =
    useTags(task.user_id ?? null)
  /* Status button ref: Used to position the status popover */
  const statusButtonRef = useRef<HTMLButtonElement>(null)
  /* Priority button ref: Used to position the priority popover */
  const priorityButtonRef = useRef<HTMLButtonElement>(null)
  /* Time estimate button ref: Used to position the time estimate popover */
  const timeEstimateButtonRef = useRef<HTMLButtonElement>(null)
  /* Date button ref: Used to position the date picker popover */
  const dateButtonRef = useRef<HTMLButtonElement>(null)
  const dateDisplay = formatDateWithOptionalTime(task.due_date) ?? formatDateWithOptionalTime(task.start_date)
  const isDueOverdue = Boolean(task.due_date && isOverdue(task.due_date))
  const isRecurring = Boolean(task.recurrence_pattern)
  /* medium = "normal" for display; ensure priority is valid for flag classes */
  const priority: TaskPriority = task.priority ?? 'medium'

  /* Refs: Measure container, right section, and left icons to calculate available width for task name */
  const containerRef = useRef<HTMLDivElement>(null)
  const rightSectionRef = useRef<HTMLDivElement>(null)
  const leftIconsBeforeRef = useRef<HTMLDivElement>(null)
  const dependencyIconsRef = useRef<HTMLDivElement>(null)
  const leftIconsAfterRef = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState<number | undefined>(undefined)

  /* Calculate available width: Container width - right section - left icons before - dependency icons - left icons after - gaps */
  useEffect(() => {
    const calculateAvailableWidth = () => {
      if (!containerRef.current || !rightSectionRef.current || !leftIconsBeforeRef.current || !leftIconsAfterRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const rightRect = rightSectionRef.current.getBoundingClientRect()
      const leftIconsBeforeRect = leftIconsBeforeRef.current.getBoundingClientRect()
      const dependencyIconsRect = dependencyIconsRef.current?.getBoundingClientRect()
      const leftIconsAfterRect = leftIconsAfterRef.current.getBoundingClientRect()
      
      /* Calculate: container width - right section - left icons before - dependency icons - left icons after - gaps */
      const containerWidth = containerRect.width
      const rightWidth = rightRect.width
      const leftIconsBeforeWidth = leftIconsBeforeRect.width
      const dependencyIconsWidth = dependencyIconsRect?.width ?? 0
      const leftIconsAfterWidth = leftIconsAfterRect.width
      const gapBetweenSections = 16 // gap-4 = 16px between left and right sections
      const gapInLeftSection = 8 // gap-2 = 8px between items in left section
      const padding = 32 // px-4 = 16px on each side
      
      /* Available width = container - right - left icons before - dependency icons - left icons after - gaps - padding */
      const available = containerWidth - rightWidth - leftIconsBeforeWidth - dependencyIconsWidth - leftIconsAfterWidth - gapBetweenSections - (gapInLeftSection * 3) - padding
      
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
  }, [hasSubtasks, checklistSummary, task.tags, isBlocked, isBlocking, isShared, task.description, task.time_estimate, dateDisplay])

  /* Tablet mode: use TabletTaskItem component for consistent icon layout */
  if (tablet) {
    return (
      <TabletTaskItem
        task={task}
        checklistSummary={checklistSummary}
        totalTimeWithSubtasks={totalTimeWithSubtasks}
        isBlocked={isBlocked}
        isBlocking={isBlocking}
        blockingCount={blockingCount}
        blockedByCount={blockedByCount}
        isShared={isShared}
        onClick={onClick}
        formatDueDate={formatDateWithOptionalTime}
      />
    )
  }

  /* Row click: Open edit modal unless the click was on the subtask expand button */
  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-subtask-expand]')) return
    onClick?.()
  }

  return (
    <div
      ref={containerRef}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={handleRowClick}
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
      className="group flex items-center justify-between gap-4 rounded-lg border border-bonsai-slate-200 bg-white px-4 py-3 transition-colors hover:bg-bonsai-slate-50"
    >
      {/* Left section: subtask arrow (desktop hover) or chevron, status, task name, then other icons */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* Left icons before task name: Subtask arrow (desktop hover) and status circle */}
        <div ref={leftIconsBeforeRef} className="flex shrink-0 items-center gap-2">
          {/* Subtask arrow: Tooltip = Expand/Collapse when task has subtasks, "Create subtask" when it doesn't; click expands and may focus add-subtask input */}
          {onToggleExpand && (
            <Tooltip
              content={
                hasSubtasks
                  ? (expanded ? 'Collapse subtasks' : 'Expand subtasks')
                  : 'Create subtask'
              }
              position="top"
              size="sm"
            >
              <span
                className={`shrink-0 inline-flex ${!hasSubtasks && !expanded ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}
              >
                <button
                  type="button"
                  data-subtask-expand
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    const wasExpanded = expanded
                    onToggleExpand()
                    /* When task has no subtasks, expanding reveals add-subtask line; focus it so user can type immediately */
                    if (!wasExpanded && !hasSubtasks) onExpandForSubtask?.()
                  }}
                  className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-bonsai-slate-600 hover:bg-bonsai-slate-100 hover:text-bonsai-slate-800 transition-colors"
                  aria-expanded={expanded}
                  aria-label={expanded ? 'Collapse subtasks' : 'Create subtask'}
                >
                  {expanded ? (
                    <ChevronDownIcon className="w-4 h-4 rotate-0" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </button>
              </span>
            </Tooltip>
          )}
          {/* Status circle: Tooltip on hover shows status; click opens status picker popover */}
          <Tooltip content={getStatusLabel(displayStatus)} position="top" size="sm">
            <span className="shrink-0 inline-flex">
              <button
                ref={statusButtonRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  /* Open status picker popover */
                  if (onUpdateStatus) {
                    setIsStatusModalOpen(true)
                  }
                }}
                className="shrink-0 flex items-center justify-center rounded hover:bg-bonsai-slate-100 transition-colors p-1"
                aria-label="Change task status"
                disabled={!onUpdateStatus}
              >
              <TaskStatusIndicator status={displayStatus} />
              </button>
            </span>
          </Tooltip>
        </div>
        
        {/* Task name and dependency icons: Grouped together to keep dependency icons next to name */}
        <div className="flex min-w-0 items-center gap-1.5">
          <TaskNameHover 
            title={task.title} 
            status={task.status} 
            maxWidth={availableWidth}
          />
          
          {/* Dependency icons: Clickable to open Task Dependencies popover */}
          {(isBlocked || isBlocking) && (
            <div ref={dependencyIconsRef} className="flex shrink-0 items-center gap-1.5">
              <button
                ref={dependencyIconsButtonRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (getTasks && getTaskDependencies && onAddDependency) {
                    setIsDependenciesPopoverOpen(true)
                  }
                }}
                className="flex shrink-0 items-center gap-1.5 rounded p-0.5 text-bonsai-slate-500 hover:bg-bonsai-slate-100 hover:text-bonsai-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Manage task dependencies"
                disabled={!getTasks || !getTaskDependencies || !onAddDependency}
                title="Task dependencies"
              >
                {/* Blocked icon: Shows when task is blocked by another */}
                {isBlocked && (
                  <DependencyTooltip
                    blockingCount={blockingCount}
                    blockedByCount={blockedByCount}
                    position="top"
                  >
                    <span className="shrink-0">
                      <BlockedIcon className="w-4 h-4 md:w-5 md:h-5" />
                    </span>
                  </DependencyTooltip>
                )}
                {/* Blocking icon: Shows when task is blocking another */}
                {isBlocking && (
                  <DependencyTooltip
                    blockingCount={blockingCount}
                    blockedByCount={blockedByCount}
                    position="top"
                  >
                    <span className="shrink-0 text-amber-500">
                      <WarningIcon className="w-4 h-4 md:w-5 md:h-5" />
                    </span>
                  </DependencyTooltip>
                )}
              </button>
            </div>
          )}
        </div>
        
        {/* Left icons after task name: Description, checklist, tag, shared */}
        <div ref={leftIconsAfterRef} className="flex shrink-0 items-center gap-2">
          {/* Description icon: Shows tooltip with description on hover */}
          {task.description?.trim() && (
            <DescriptionTooltip 
              description={task.description} 
              attachmentCount={task.attachments?.length ?? 0}
              position="top"
            >
              <span className="shrink-0 text-bonsai-slate-500">
                <ParagraphIcon className="w-4 h-4 md:w-5 md:h-5" />
              </span>
            </DescriptionTooltip>
          )}
          {/* Checklist indicator */}
          {checklistSummary && checklistSummary.total > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-bonsai-slate-600">
              <ChecklistIcon className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm">
                {checklistSummary.completed}/{checklistSummary.total}
              </span>
            </span>
          )}
          {/* Tags: Clickable pills to open tag modal - only show when task has tags */}
          {task.tags && task.tags.length > 0 && (
            <button
              ref={tagButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (onUpdateTask) {
                  setIsTagModalOpen(true)
                }
              }}
              className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-left hover:bg-bonsai-slate-100 transition-colors"
              aria-label="Manage tags"
              disabled={!onUpdateTask}
              title="Add or edit tags"
            >
              {task.tags.slice(0, 3).map((t) => (
                <span
                  key={t.id}
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
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
            </button>
          )}
          {/* Shared icon */}
          {isShared && (
            <span className="shrink-0 text-bonsai-slate-500">
              <UsersIcon className="w-4 h-4 md:w-5 md:h-5" />
            </span>
          )}
        </div>
      </div>

      {/* Right section: time estimate, date/time or repeat icon, priority flag */}
      <div ref={rightSectionRef} className="flex shrink-0 items-center gap-2">
        {task.time_estimate != null && task.time_estimate > 0 && (
          <TimeEstimateTooltip
            minutes={task.time_estimate}
            totalWithSubtasks={totalTimeWithSubtasks}
            position="top"
          >
            <button
              ref={timeEstimateButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                /* Open time estimate modal when icon is clicked */
                if (onUpdateTask) {
                  setIsTimeEstimateModalOpen(true)
                }
              }}
              className="flex items-center gap-1 text-sm text-bonsai-slate-600 hover:text-bonsai-slate-800 transition-colors"
              aria-label="Edit time estimate"
              disabled={!onUpdateTask}
            >
              <HourglassIcon className="w-4 h-4 md:w-5 md:h-5" aria-hidden />
              {task.time_estimate < 60
                ? `${task.time_estimate}m`
                : `${Math.floor(task.time_estimate / 60)}h${task.time_estimate % 60 ? ` ${task.time_estimate % 60}m` : ''}`}
            </button>
          </TimeEstimateTooltip>
        )}
        {(dateDisplay || onUpdateTask) && (
          (() => {
            /* Tooltip content: Start and/or due date lines when task has dates (full task view only) */
            const startFormatted = formatDateForTooltip(task.start_date)
            const dueFormatted = formatDateForTooltip(task.due_date)
            const dateTooltipContent =
              startFormatted || dueFormatted ? (
                <div className="text-center text-secondary text-bonsai-slate-800">
                  {startFormatted && <div>Started {startFormatted}</div>}
                  {dueFormatted && <div>Due on {dueFormatted}</div>}
                </div>
              ) : null
            const dateButton = (
              <button
                ref={dateButtonRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onUpdateTask) setIsDatePickerModalOpen(true)
                }}
                className="flex items-center gap-1 text-sm text-bonsai-slate-600 hover:text-bonsai-slate-800 transition-colors shrink-0 min-w-0"
                aria-label={dateDisplay ? 'Edit start/due date' : 'Add start/due date'}
                disabled={!onUpdateTask}
              >
                {isRecurring ? (
                  <RepeatIcon className="w-4 h-4 md:w-5 md:h-5 shrink-0" aria-hidden />
                ) : (
                  <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 shrink-0" aria-hidden />
                )}
                {dateDisplay ? (
                  <span className={`truncate ${isDueOverdue ? 'text-red-600 font-medium' : ''}`}>
                    {dateDisplay}
                  </span>
                ) : (
                  <span>Add date</span>
                )}
              </button>
            )
            return dateTooltipContent ? (
              <Tooltip content={dateTooltipContent} position="top" size="sm">
                <span className="shrink-0 inline-flex min-w-0">{dateButton}</span>
              </Tooltip>
            ) : (
              dateButton
            )
          })()
        )}
        <button
          ref={priorityButtonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            /* Open priority picker when flag is clicked */
            if (onUpdateTask) {
              setIsPriorityModalOpen(true)
            }
          }}
          className={`flex items-center gap-1.5 rounded p-1 text-sm transition-colors hover:bg-bonsai-slate-100 ${getPriorityFlagClasses(priority)}`}
          aria-label="Edit priority"
          disabled={!onUpdateTask}
        >
          <FlagIcon className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
          <span className="shrink-0 text-sm text-bonsai-slate-600">{getPriorityLabel(priority)}</span>
        </button>
      </div>

      {/* Status picker popover: Opens when status circle is clicked, positioned below the circle */}
      {onUpdateStatus && (
        <StatusPickerModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          value={displayStatus}
          triggerRef={statusButtonRef}
          onSelect={async (newDisplayStatus) => {
            try {
              const newTaskStatus = getTaskStatus(newDisplayStatus)
              /* When completing: show unresolved-items modal if there are open subtasks or checklist items */
              if (newDisplayStatus === 'complete') {
                const unresolvedChecklist = (checklistSummary?.total ?? 0) - (checklistSummary?.completed ?? 0)
                const unresolvedSubtasks = incompleteSubtaskCount
                if (unresolvedChecklist + unresolvedSubtasks > 0) {
                  setIsStatusModalOpen(false)
                  setIsUnresolvedModalOpen(true)
                  return
                }
              }
              await onUpdateStatus(task.id, newTaskStatus)
            } catch (error) {
              console.error('Failed to update task status:', error)
              // Keep popover open on error so user can try again
            }
          }}
        />
      )}
      {/* Unresolved items confirm: Shown when user tries to complete task with open subtasks or checklist items */}
      <UnresolvedItemsConfirmModal
        isOpen={isUnresolvedModalOpen}
        onClose={() => setIsUnresolvedModalOpen(false)}
        unresolvedSubtaskCount={incompleteSubtaskCount}
        unresolvedChecklistItemCount={(checklistSummary?.total ?? 0) - (checklistSummary?.completed ?? 0)}
        onCompleteWithoutResolving={async () => {
          try {
            await onUpdateStatus?.(task.id, 'completed')
            setIsUnresolvedModalOpen(false)
          } catch (error) {
            console.error('Failed to complete task:', error)
          }
        }}
        onCompleteAndResolveAll={async () => {
          try {
            await onCompleteTaskAndResolveAll?.(task.id)
            setIsUnresolvedModalOpen(false)
          } catch (error) {
            console.error('Failed to complete task and resolve items:', error)
          }
        }}
      />
      {/* Time estimate popover: Opens when time estimate icon is clicked */}
      {onUpdateTask && (
        <TimeEstimateModal
          isOpen={isTimeEstimateModalOpen}
          onClose={() => setIsTimeEstimateModalOpen(false)}
          minutes={task.time_estimate}
          onSave={async (minutes) => {
            await onUpdateTask(task.id, { time_estimate: minutes })
          }}
          taskId={task.id}
          parentTaskMinutes={task.time_estimate}
          triggerRef={timeEstimateButtonRef}
        />
      )}
      {/* Priority picker popover: Opens when priority flag is clicked, positioned below the flag */}
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
              console.error('Failed to update priority:', error)
              // Keep popover open on error so user can try again
            }
          }}
        />
      )}
      {/* Tag modal: Opens when tag icon/pills are clicked */}
      {onUpdateTask && (
        <TagModal
          isOpen={isTagModalOpen}
          onClose={() => setIsTagModalOpen(false)}
          value={task.tags ?? []}
          onSave={async (tags) => {
            try {
              await setTagsForTask(task.id, tags.map((t) => t.id))
              onTagsUpdated?.()
            } catch (err) {
              console.error('Failed to update tags:', err)
            }
          }}
          triggerRef={tagButtonRef}
          taskId={task.id}
          searchTags={searchTags}
          createTag={createTag}
          updateTag={updateTag}
          deleteTagFromAllTasks={deleteTagFromAllTasks}
        />
      )}
      {/* Date picker popover: Opens when date button is clicked, positioned below it */}
      {onUpdateTask && (
        <DatePickerModal
          isOpen={isDatePickerModalOpen}
          onClose={() => setIsDatePickerModalOpen(false)}
          startDate={task.start_date}
          dueDate={task.due_date}
          onSave={async (start, due) => {
            try {
              await onUpdateTask(task.id, {
                start_date: start,
                due_date: due,
              })
            } catch (error) {
              console.error('Failed to update dates:', error)
              throw error
            }
          }}
          triggerRef={dateButtonRef}
        />
      )}
      {/* Task dependencies popover: Opens when dependency icon is clicked, separate from edit modal */}
      {getTasks && getTaskDependencies && onAddDependency && (
        <TaskDependenciesPopover
          isOpen={isDependenciesPopoverOpen}
          onClose={() => setIsDependenciesPopoverOpen(false)}
          triggerRef={dependencyIconsButtonRef}
          currentTaskId={task.id}
          getTasks={getTasks}
          getTaskDependencies={getTaskDependencies}
          onAddDependency={onAddDependency}
          onRemoveDependency={onRemoveDependency}
          onDependenciesChanged={onDependenciesChanged}
        />
      )}
    </div>
  )
}
