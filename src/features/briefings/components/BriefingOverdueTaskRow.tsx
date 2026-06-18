/* BriefingOverdueTaskRow: Missed-items task row with inline complete */

import { MaterialIcon } from '../../../components/MaterialIcon'
import { formatStartDueDisplay, getDueStatus } from '../../tasks/utils/date'
import type { Task } from '../../tasks/types'

interface BriefingOverdueTaskRowProps {
  task: Task
  timeZone: string
  onToggleComplete: (taskId: string) => void
  onEdit: (task: Task) => void
}

/** Priority badge label and colors for briefing overdue rows */
function priorityBadge(priority: Task['priority']): { label: string; className: string } | null {
  if (priority === 'high' || priority === 'urgent') {
    return { label: priority === 'urgent' ? 'Urgent' : 'High', className: 'bg-error-container text-error' }
  }
  if (priority === 'medium') {
    return { label: 'Medium', className: 'bg-secondary-container/50 text-secondary' }
  }
  return null
}

/**
 * Mock-aligned overdue task row for the missed-items briefing step.
 */
export function BriefingOverdueTaskRow({
  task,
  timeZone,
  onToggleComplete,
  onEdit,
}: BriefingOverdueTaskRowProps) {
  const badge = priorityBadge(task.priority)
  const dueLabel = formatStartDueDisplay(null, task.due_date, timeZone)
  const dueStatus = getDueStatus(task.due_date, timeZone)
  const dueWording = dueStatus === 'overdue' ? 'Due Yesterday' : dueLabel ?? 'Overdue'
  const tag = task.tags[0]?.name ?? task.category

  return (
    <div className="group flex items-center gap-4 rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4 transition-all hover:border-primary/40">
      <button
        type="button"
        onClick={() => onToggleComplete(task.id)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-outline-variant text-primary transition-colors group-hover:border-primary"
        aria-label={`Complete ${task.title}`}
      >
        <MaterialIcon name="check" className="text-lg opacity-0 group-hover:opacity-100" />
      </button>
      <button
        type="button"
        onClick={() => onEdit(task)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-body font-medium text-on-surface">{task.title}</h3>
          {badge != null && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {tag ? (
            <span className="text-secondary flex items-center gap-1 text-xs text-on-surface-variant">
              <MaterialIcon name="tag" className="text-sm" />
              {tag}
            </span>
          ) : null}
          <span className="text-secondary flex items-center gap-1 text-xs text-outline">
            <MaterialIcon name="calendar_today" className="text-sm" />
            {dueWording}
          </span>
        </div>
      </button>
    </div>
  )
}
