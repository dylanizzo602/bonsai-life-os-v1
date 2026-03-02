/* UpcomingTasksWidget: First 5 available tasks in compact view; View All and Add task */

import { CompactTaskItem } from '../../tasks/CompactTaskItem'
import { DashboardWidget } from './DashboardWidget'
import { useUpcomingTasks } from '../hooks/useUpcomingTasks'
import { formatStartDueDisplay } from '../../tasks/utils/date'
import type { Task } from '../../tasks/types'
import { Button } from '../../../components/Button'

export interface UpcomingTasksWidgetProps {
  onViewAll: () => void
  onAddTask: () => void
  onOpenEditTask?: (task: Task) => void
}

/**
 * Upcoming tasks widget: 5 available tasks (compact), View All, Add task.
 */
export function UpcomingTasksWidget({
  onViewAll,
  onAddTask,
  onOpenEditTask,
}: UpcomingTasksWidgetProps) {
  const upcomingTasks = useUpcomingTasks()
  const formatDue = (iso: string | null | undefined) => formatStartDueDisplay(iso, null)

  return (
    <DashboardWidget
      title="Upcoming Tasks"
      actions={
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onViewAll}>
            View All
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onAddTask}>
            + Add task
          </Button>
        </div>
      }
    >
      {upcomingTasks.length === 0 ? (
        <p className="text-secondary text-bonsai-slate-500">No upcoming tasks.</p>
      ) : (
        <ul className="space-y-2">
          {upcomingTasks.map((task) => (
            <li key={task.id}>
              <CompactTaskItem
                task={task}
                formatDueDate={formatDue}
                onClick={() => onOpenEditTask?.(task)}
              />
            </li>
          ))}
        </ul>
      )}
    </DashboardWidget>
  )
}
