/* BriefingLineupTaskRow: Task row in Today's Lineup on plan step */

import { useRef, useState, type MouseEvent } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { PriorityFlagIcon } from '../../tasks/components/PriorityFlagIcon'
import { BonsaiTaskStatusButton } from '../../tasks/components/bonsai/BonsaiTaskStatusButton'
import { StatusPickerModal } from '../../tasks/modals/StatusPickerModal'
import { getTaskDisplayStatus, getTaskStatusFromDisplayStatus } from '../../tasks/TaskStatusIndicator'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
import { getDueDateColorClass, getLineupDateDisplay } from '../../tasks/utils/taskRowDisplay'
import { isPriorityMediumOrAbove } from '../../tasks/utils/available'
import type { Task, TaskStatus } from '../../tasks/types'

interface BriefingLineupTaskRowProps {
  task: Task
  goalName?: string | null
  onUpdateStatus?: (taskId: string, status: TaskStatus) => Promise<void>
  onEdit: (task: Task) => void
}

/**
 * Lineup task card for the plan-day briefing step.
 */
export function BriefingLineupTaskRow({
  task,
  goalName,
  onUpdateStatus,
  onEdit,
}: BriefingLineupTaskRowProps) {
  const timeZone = useUserTimeZone()
  const statusButtonRef = useRef<HTMLButtonElement>(null)
  const [statusPickerOpen, setStatusPickerOpen] = useState(false)

  const showPriority = isPriorityMediumOrAbove(task.priority)
  const tag = task.tags[0]?.name ?? task.category
  const dateDisplay = getLineupDateDisplay(task, timeZone)
  const dateColorClass = getDueDateColorClass(task.due_date, timeZone)
  const isRecurring = Boolean(task.recurrence_pattern)

  /* Status click: open shared status picker popover (open / in progress / complete). */
  const handleStatusClick = (e: MouseEvent) => {
    e.stopPropagation()
    if (!onUpdateStatus) return
    setStatusPickerOpen(true)
  }

  return (
    <>
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

      <div className="group flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm transition-all hover:border-primary">
        <BonsaiTaskStatusButton
          status={task.status}
          buttonRef={statusButtonRef}
          onClick={handleStatusClick}
          disabled={!onUpdateStatus}
        />
        <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left">
          <h4 className="text-body font-medium text-on-surface">{task.title}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {showPriority && (
              <span className="text-secondary flex items-center gap-1 text-xs font-medium text-error">
                <PriorityFlagIcon priority={task.priority} />
                {task.priority === 'urgent' || task.priority === 'high' ? 'High Priority' : 'Priority'}
              </span>
            )}
            {goalName ? (
              <span className="text-secondary flex items-center gap-1 text-xs font-medium text-primary">
                <MaterialIcon name="emoji_events" className="text-xs" />
                {goalName}
              </span>
            ) : tag ? (
              <span className="text-secondary text-xs text-on-surface-variant">{tag}</span>
            ) : null}
          </div>
        </button>
        {dateDisplay ? (
          <div
            className={`flex shrink-0 items-center gap-1 text-[11px] font-medium ${dateColorClass}`}
          >
            <MaterialIcon name="calendar_today" className="text-[16px]" />
            <span className="flex items-center gap-1">
              {dateDisplay}
              {isRecurring ? (
                <MaterialIcon name="sync" className="text-[14px]" aria-hidden />
              ) : null}
            </span>
          </div>
        ) : null}
      </div>
    </>
  )
}
