/* BriefingLineupTaskRow: Task row in Today's Lineup on plan step */

import { MaterialIcon } from '../../../components/MaterialIcon'
import { PriorityFlagIcon } from '../../tasks/components/PriorityFlagIcon'
import { isPriorityMediumOrAbove } from '../../tasks/utils/available'
import type { Task } from '../../tasks/types'

interface BriefingLineupTaskRowProps {
  task: Task
  goalName?: string | null
  onToggleComplete: (taskId: string) => void
  onEdit: (task: Task) => void
}

/**
 * Lineup task card for the plan-day briefing step.
 */
export function BriefingLineupTaskRow({
  task,
  goalName,
  onToggleComplete,
  onEdit,
}: BriefingLineupTaskRowProps) {
  const showPriority = isPriorityMediumOrAbove(task.priority)
  const tag = task.tags[0]?.name ?? task.category

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm transition-all hover:border-primary">
      <button
        type="button"
        onClick={() => onToggleComplete(task.id)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-outline group-hover:border-primary"
        aria-label={`Complete ${task.title}`}
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
    </div>
  )
}
