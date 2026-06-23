/* TaskNotificationItem: Overdue or due-soon task row in the notification bell */

import { TruncatedText } from '../../../components/TruncatedText'
import { formatStartDueDisplay } from '../../tasks/utils/date'
import { getDueDateColorClass } from '../../tasks/utils/taskRowDisplay'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
import type { Task } from '../../tasks/types'

export interface TaskNotificationItemProps {
  task: Task
  variant: 'task_overdue' | 'task_due_soon'
  onOpen: () => void
}

/**
 * Compact task notification card for the bell popover.
 */
export function TaskNotificationItem({ task, variant, onOpen }: TaskNotificationItemProps) {
  const timeZone = useUserTimeZone()
  const dueLabel = formatStartDueDisplay(task.start_date, task.due_date, timeZone) ?? 'Due'
  const dueColorClass = getDueDateColorClass(task.due_date, timeZone)
  const chipLabel = variant === 'task_overdue' ? 'Overdue' : 'Due soon'
  const chipClass =
    variant === 'task_overdue'
      ? 'bg-error/10 text-error'
      : 'bg-amber-500/10 text-amber-700'

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-1 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-left transition-colors hover:bg-surface-container-low/80"
    >
      <div className="flex items-start justify-between gap-2 pr-16">
        <TruncatedText className="text-body font-medium text-on-surface">
          {task.title || 'Untitled task'}
        </TruncatedText>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${chipClass}`}>
          {chipLabel}
        </span>
      </div>
      <span className={`text-secondary ${dueColorClass}`}>{dueLabel}</span>
    </button>
  )
}
