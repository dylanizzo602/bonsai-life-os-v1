/* MilestoneItem component: Individual milestone display with completion status */
import { Checkbox } from '../../components/Checkbox'
import { CompactTaskItem } from '../tasks/CompactTaskItem'
import { formatStartDueDisplay } from '../tasks/utils/date'
import type { GoalMilestone } from './types'
import type { Task } from '../tasks/types'

interface MilestoneItemProps {
  /** Milestone data (may include task when type is 'task') */
  milestone: GoalMilestone
  /** Toggle completion handler */
  onToggleComplete: (id: string, completed: boolean) => void
  /** Edit milestone handler */
  onEdit: (milestone: GoalMilestone) => void
  /** Delete milestone handler */
  onDelete: (id: string) => void
  /** When task is shown, called so parent can refetch (e.g. after navigating back from task) */
  onTaskUpdated?: () => void
  /** Open task edit modal when user clicks the linked task */
  onOpenEditTaskModal?: (task: Task) => void
  /** Open task context menu when user right-clicks the linked task */
  onOpenTaskContextMenu?: (task: Task, x: number, y: number) => void
}

/**
 * Milestone item component.
 * Displays milestone with type-specific information and completion status.
 */
export function MilestoneItem({
  milestone,
  onToggleComplete,
  onEdit,
  onDelete,
  onTaskUpdated,
  onOpenEditTaskModal,
  onOpenTaskContextMenu,
}: MilestoneItemProps) {
  /* Determine if milestone is completed based on type */
  const isCompleted =
    milestone.type === 'task'
      ? milestone.completed
      : milestone.type === 'number'
        ? milestone.current_value != null &&
          milestone.target_value != null &&
          milestone.current_value >= milestone.target_value
        : milestone.completed

  /* Format number milestone display */
  const formatNumberMilestone = () => {
    if (milestone.type !== 'number') return null
    const current = milestone.current_value ?? milestone.start_value ?? 0
    const target = milestone.target_value ?? 0
    const unit = milestone.unit ? ` ${milestone.unit}` : ''
    return `${current}${unit} / ${target}${unit}`
  }

  const linkedTask = milestone.type === 'task' ? milestone.task : null

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-lg border ${
        isCompleted
          ? 'bg-bonsai-slate-50 border-bonsai-slate-200 opacity-75'
          : 'bg-white border-bonsai-slate-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox: toggle completion */}
        <Checkbox
          checked={isCompleted}
          onChange={(e) => onToggleComplete(milestone.id, e.target.checked)}
        />

        {/* Milestone content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4
                className={`font-medium ${
                  isCompleted
                    ? 'line-through text-bonsai-slate-500'
                    : 'text-bonsai-brown-700'
                }`}
              >
                {milestone.title}
              </h4>
              {/* Task milestone: show linked task name when we have task data */}
              {milestone.type === 'task' && (
                <p className="text-secondary text-bonsai-slate-600 mt-1">
                  {linkedTask ? `Linked: ${linkedTask.title}` : 'Linked to task'}
                </p>
              )}
              {milestone.type === 'number' && (
                <p className="text-secondary text-bonsai-slate-600 mt-1">
                  {formatNumberMilestone()}
                </p>
              )}
              {milestone.type === 'boolean' && (
                <p className="text-secondary text-bonsai-slate-600 mt-1">
                  {isCompleted ? 'Completed' : 'Not completed'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions: edit and delete */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(milestone)}
            className="text-bonsai-sage-600 hover:text-bonsai-sage-700 text-sm"
            aria-label="Edit milestone"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(milestone.id)}
            className="text-red-600 hover:text-red-700 text-sm"
            aria-label="Delete milestone"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Task milestone: show compact task view when task is loaded; same interactions as task view */}
      {milestone.type === 'task' && linkedTask && (
        <div className="ml-8 mt-1">
          <CompactTaskItem
            task={linkedTask}
            formatDueDate={(iso) => (iso ? formatStartDueDisplay(undefined, iso) : null)}
            onClick={() => onOpenEditTaskModal?.(linkedTask)}
            onContextMenu={(e) => {
              e.preventDefault()
              onOpenTaskContextMenu?.(linkedTask, e.clientX, e.clientY)
            }}
          />
        </div>
      )}
    </div>
  )
}
