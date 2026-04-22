/* UpcomingTasksWidget: First 5 available tasks in compact view; View All and Add task */

import { useCallback } from 'react'
import { CompactTaskItem } from '../../tasks/CompactTaskItem'
import { DashboardWidget } from './DashboardWidget'
import { useUpcomingTasks } from '../hooks/useUpcomingTasks'
import { formatStartDueDisplay } from '../../tasks/utils/date'
import { useUserTimeZone } from '../../settings/useUserTimeZone'
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
  const timeZone = useUserTimeZone()
  /* Task source: first 5 available tasks (same logic as Tasks → Available view) */
  const upcomingTasks = useUpcomingTasks()

  /* Due formatting: keep the same shared display as other task rows */
  const formatDue = (iso: string | null | undefined) => formatStartDueDisplay(iso, null, timeZone)

  /* Task row click: open edit modal if provided */
  const handleTaskClick = useCallback((task: Task) => onOpenEditTask?.(task), [onOpenEditTask])

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
          {upcomingTasks.map((task) => {
            /* Render: compact task row (habit reminders are filtered out at the hook layer) */
            return (
              <li key={task.id}>
                <CompactTaskItem
                  task={task}
                  formatDueDate={formatDue}
                  onClick={() => handleTaskClick(task)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </DashboardWidget>
  )
}
