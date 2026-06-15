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
  const statusButtonRef = useRef<HTMLButtonElement>(null)
  const priorityButtonRef = useRef<HTMLButtonElement>(null)
  const [statusPickerOpen, setStatusPickerOpen] = useState(false)
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false)
  const primaryTag = task.tags[0]
  const dateDisplay = getBacklogDateDisplay(task, timeZone)
  const dateColorClass = getDueDateColorClass(task.due_date, timeZone)
  const statusSize = size === 'sm' ? 'sm' : 'md'
  const titleClass =
    size === 'sm'
      ? 'text-on-surface-variant text-sm flex-1'
      : 'text-body font-medium text-on-surface-variant transition-colors group-hover:text-on-surface'

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
        className={`group flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-transparent px-3 transition-all hover:border-outline-variant hover:bg-surface-container-low lg:items-center lg:justify-start lg:gap-4 lg:rounded-xl lg:border-transparent lg:px-4 lg:hover:bg-surface-container ${
          size === 'sm' ? 'py-2 lg:py-2' : 'py-3 lg:py-4'
        }`}
      >
        <div className="flex items-center gap-2">
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
                className={`text-sm transition-transform ${expanded ? 'rotate-90' : ''}`}
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

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <span className={`min-w-0 truncate ${titleClass}`}>{task.title}</span>
          {task.parent_id && parentTaskTitle != null ? (
            <span
              className="text-[10px] font-medium uppercase tracking-tight text-outline"
              title={`Subtask of ${parentTaskTitle}`}
            >
              Subtask
            </span>
          ) : null}
          {primaryTag ? (
            <span className={getBacklogTagPillClassName(primaryTag)}>{primaryTag.name}</span>
          ) : null}
          {enrichment.isBlocked ? (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter text-error">
              <MaterialIcon name="block" className="text-[14px]" />
              <span>Blocked</span>
            </span>
          ) : null}
        </div>

        <div className={`flex shrink-0 items-center gap-6 text-[11px] font-medium ${dateColorClass}`}>
          {dateDisplay ? <span className="flex items-center gap-1">{dateDisplay}</span> : null}
          {task.goal_id || task.priority !== 'none' ? (
            onUpdateTask ? (
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
                {task.goal_id ? (
                  <TrophyIcon
                    className="h-5 w-5 shrink-0 stroke-yellow-500 fill-yellow-100 text-yellow-600"
                    aria-hidden
                  />
                ) : (
                  <PriorityFlagIcon priority={task.priority} className="text-xl" />
                )}
              </button>
            ) : task.goal_id ? (
              <TrophyIcon
                className="h-5 w-5 shrink-0 stroke-yellow-500 fill-yellow-100 text-yellow-600"
                aria-hidden
              />
            ) : (
              <PriorityFlagIcon priority={task.priority} className="text-xl" />
            )
          ) : null}
        </div>
      </div>
    </>
  )
}
