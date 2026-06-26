/* BacklogTaskRow: Compact row for Other tasks section */

import type { MouseEvent } from 'react'
import { useRef, useState } from 'react'
import { TrophyIcon } from '../../../../components/icons'
import { MaterialIcon } from '../../../../components/MaterialIcon'
import { PriorityFlagIcon } from '../PriorityFlagIcon'
import { useUserTimeZone } from '../../../settings/useUserTimeZone'
import type { Task } from '../../types'
import type { TaskRowEnrichment } from '../../types/taskRowEnrichment'
import {
  getBacklogDateDisplay,
  getDueDateColorClass,
} from '../../utils/taskRowDisplay'
import { getBacklogTagPillClassName } from '../../utils/tagPillStyles'
import { BonsaiTaskStatusButton } from './BonsaiTaskStatusButton'
import { StatusPickerModal } from '../../modals/StatusPickerModal'
import { PriorityPickerModal } from '../../modals/PriorityPickerModal'
import { getTaskDisplayStatus, getTaskStatusFromDisplayStatus } from '../../TaskStatusIndicator'
import { useTaskListLayout } from '../../taskListItemShared'
import type { UpdateTaskInput } from '../../types'

interface BacklogTaskRowProps {
  task: Task
  enrichment: TaskRowEnrichment
  /** When set, row is a subtask shown separately from its parent */
  parentTaskTitle?: string | null
  size?: 'md' | 'sm'
  showChevron?: boolean
  expanded?: boolean
  onToggleExpand?: () => void
  onOpen: () => void
  onContextMenu?: (e: MouseEvent) => void
  onToggleComplete: () => void
  onUpdateStatus?: (taskId: string, status: import('../../types').TaskStatus) => Promise<void>
  onUpdateTask?: (taskId: string, input: UpdateTaskInput) => Promise<void>
}

/**
 * Simpler backlog task row with optional chevron for parent tasks.
 */
export function BacklogTaskRow({
  task,
  enrichment,
  parentTaskTitle = null,
  size = 'md',
  showChevron = false,
  expanded = false,
  onToggleExpand,
  onOpen,
  onContextMenu,
  onToggleComplete,
  onUpdateStatus,
  onUpdateTask,
}: BacklogTaskRowProps) {
  const timeZone = useUserTimeZone()
  const viewport = useTaskListLayout()
  const statusButtonRef = useRef<HTMLButtonElement>(null)
  const priorityButtonRef = useRef<HTMLButtonElement>(null)
  const [statusPickerOpen, setStatusPickerOpen] = useState(false)
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false)
  const primaryTag = task.tags[0]
  const dateDisplay = getBacklogDateDisplay(task, timeZone)
  const dateColorClass = getDueDateColorClass(task.due_date, timeZone)
  const isRecurring = Boolean(task.recurrence_pattern)
  const showPriority = task.goal_id || task.priority !== 'none'
  const showSubtaskBadge = Boolean(task.parent_id && parentTaskTitle != null)
  const isCompact = size === 'sm'
  const statusSize = viewport === 'desktop' && !isCompact ? 'md' : 'sm'

  /* Typography: smaller on mobile/tablet, body/secondary sizes on desktop */
  const titleClass = isCompact
    ? 'text-xs font-medium text-on-surface-variant lg:text-sm'
    : 'text-sm font-medium text-on-surface-variant transition-colors group-hover:text-on-surface lg:text-body'
  const metadataClass = isCompact
    ? 'text-[9px] font-medium text-outline/70 lg:text-[10px]'
    : 'text-[11px] font-medium text-outline/70 lg:text-secondary'
  const calendarIconClass = isCompact
    ? 'text-[10px] lg:text-[12px]'
    : 'text-[11px] lg:text-[14px]'
  const syncIconClass = isCompact
    ? 'text-[9px] lg:text-[10px]'
    : 'text-[9px] lg:text-[12px]'
  const blockIconClass = isCompact
    ? 'text-[10px] lg:text-[12px]'
    : 'text-[11px] lg:text-[14px]'
  const priorityFlagClass = isCompact
    ? 'text-sm lg:text-lg'
    : 'text-base lg:text-xl'
  const priorityTrophyClass = isCompact
    ? 'h-3.5 w-3.5 lg:h-4 lg:w-4'
    : 'h-4 w-4 lg:h-5 lg:w-5'

  const hasMetadataRow =
    showSubtaskBadge || primaryTag || enrichment.isBlocked || dateDisplay || showPriority

  /* Priority control: tappable when onUpdateTask is set */
  const renderPriorityIndicator = (flagClass: string, trophyClass: string) => {
    if (task.goal_id) {
      return (
        <TrophyIcon
          className={`${trophyClass} shrink-0 stroke-yellow-500 fill-yellow-100 text-yellow-600`}
          aria-hidden
        />
      )
    }
    return <PriorityFlagIcon priority={task.priority} className={flagClass} />
  }

  const renderPriorityControl = (flagClass: string, trophyClass: string) => {
    if (!showPriority) return null
    const indicator = renderPriorityIndicator(flagClass, trophyClass)
    if (!onUpdateTask) return indicator
    return (
      <button
        ref={priorityButtonRef}
        type="button"
        data-task-interactive
        onClick={(e) => {
          e.stopPropagation()
          setPriorityPickerOpen(true)
        }}
        className="shrink-0 rounded p-0.5 transition-colors hover:bg-surface-container-low"
        aria-label={task.goal_id ? 'Edit priority (linked to goal)' : 'Edit priority'}
      >
        {indicator}
      </button>
    )
  }

  return (
    <>
      {/* Status picker: shared popover so backlog rows can change status beyond complete. */}
      {onUpdateStatus ? (
        <StatusPickerModal
          isOpen={statusPickerOpen}
          onClose={() => setStatusPickerOpen(false)}
          value={getTaskDisplayStatus(task.status)}
          triggerRef={statusButtonRef}
          onSelect={async (newDisplayStatus) => {
            const nextStatus = getTaskStatusFromDisplayStatus(newDisplayStatus)
            await onUpdateStatus(task.id, nextStatus)
          }}
        />
      ) : null}

      {onUpdateTask ? (
        <PriorityPickerModal
          isOpen={priorityPickerOpen}
          onClose={() => setPriorityPickerOpen(false)}
          value={task.priority}
          triggerRef={priorityButtonRef}
          onSelect={async (newPriority) => {
            await onUpdateTask(task.id, { priority: newPriority })
          }}
        />
      ) : null}

      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onContextMenu={onContextMenu}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        }}
        className={`group flex cursor-pointer items-start gap-1.5 rounded-lg border border-transparent px-2.5 transition-all hover:border-outline-variant hover:bg-surface-container-low lg:gap-2 lg:rounded-xl lg:px-4 lg:hover:bg-surface-container ${
          isCompact ? 'py-1.5 lg:py-2' : 'py-2.5 lg:py-3.5'
        }`}
      >
        {/* Leading controls: expand chevron + status button */}
        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          {showChevron ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand?.()
              }}
              className="flex shrink-0 items-center justify-center p-0.5 text-outline transition-transform hover:text-primary"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
            >
              <MaterialIcon
                name="chevron_right"
                className={`text-xs transition-transform lg:text-sm ${expanded ? 'rotate-90' : ''}`}
              />
            </button>
          ) : null}
          <BonsaiTaskStatusButton
            status={task.status}
            size={statusSize}
            onClick={(e) => {
              e.stopPropagation()
              if (!onUpdateStatus) {
                if (task.status !== 'completed') onToggleComplete()
                return
              }
              setStatusPickerOpen(true)
            }}
            buttonRef={statusButtonRef}
            disabled={!onUpdateStatus}
          />
        </div>

        {/* Content: title row, then compact metadata row */}
        <div className="min-w-0 flex-1">
          <span className={`block min-w-0 truncate ${titleClass}`}>{task.title}</span>

          {hasMetadataRow ? (
            <div
              className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 lg:mt-1 lg:gap-x-3 lg:gap-y-1 ${metadataClass}`}
            >
              {showSubtaskBadge ? (
                <span
                  className="shrink-0 uppercase tracking-tight text-outline"
                  title={`Subtask of ${parentTaskTitle}`}
                >
                  Subtask
                </span>
              ) : null}
              {primaryTag ? (
                <span
                  className={`${getBacklogTagPillClassName(primaryTag)} max-lg:px-1.5 max-lg:py-px max-lg:text-[9px]`}
                >
                  {primaryTag.name}
                </span>
              ) : null}
              {enrichment.isBlocked ? (
                <span className="flex shrink-0 items-center gap-0.5 font-bold uppercase tracking-tighter text-error lg:gap-1">
                  <MaterialIcon name="block" className={blockIconClass} />
                  <span>Blocked</span>
                </span>
              ) : null}
              {dateDisplay ? (
                <span className={`flex shrink-0 items-center gap-0.5 lg:gap-1 ${dateColorClass}`}>
                  <MaterialIcon name="calendar_today" className={calendarIconClass} />
                  <span>{dateDisplay}</span>
                  {isRecurring ? (
                    <MaterialIcon name="sync" className={syncIconClass} aria-hidden />
                  ) : null}
                </span>
              ) : null}
              {renderPriorityControl(priorityFlagClass, priorityTrophyClass)}
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
