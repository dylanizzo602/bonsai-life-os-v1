/* UpcomingTasksWidget: First available tasks in dashboard bento layout */

import { useCallback } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { DashboardBentoCard } from './DashboardBentoCard'
import { DashboardTaskRow } from './DashboardTaskRow'
import { useUpcomingTasks } from '../hooks/useUpcomingTasks'
import type { Task } from '../../tasks/types'

export interface UpcomingTasksWidgetProps {
  onAddTask: () => void
  onOpenEditTask?: (task: Task) => void
  onToggleComplete?: (taskId: string) => void
}

/**
 * Upcoming tasks bento widget (7-column span): up to 5 tasks, Bonsai row styling.
 */
export function UpcomingTasksWidget({
  onAddTask,
  onOpenEditTask,
  onToggleComplete,
}: UpcomingTasksWidgetProps) {
  const upcomingTasks = useUpcomingTasks()

  const handleTaskClick = useCallback((task: Task) => onOpenEditTask?.(task), [onOpenEditTask])

  return (
    <DashboardBentoCard
      title="Upcoming Tasks"
      titleIcon={<MaterialIcon name="check_circle" className="text-[24px] text-outline" />}
      actions={
        <button
          type="button"
          onClick={onAddTask}
          className="rounded-full p-2 text-primary transition-colors hover:bg-surface-container"
          aria-label="Add task"
        >
          <MaterialIcon name="add" className="text-[24px]" />
        </button>
      }
    >
      {upcomingTasks.length === 0 ? (
        <p className="text-secondary text-on-surface-variant">No upcoming tasks.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {upcomingTasks.map((task) => (
            <DashboardTaskRow
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task)}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      )}
    </DashboardBentoCard>
  )
}
