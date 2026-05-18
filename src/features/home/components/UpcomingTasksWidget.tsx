/* UpcomingTasksWidget: First 5 available tasks in dashboard bento layout */

import { useCallback, useMemo } from 'react'
import { DashboardBentoCard } from './DashboardBentoCard'
import { DashboardTaskRow } from './DashboardTaskRow'
import { useUpcomingTasks } from '../hooks/useUpcomingTasks'
import { useDashboardTaskEnrichment } from '../hooks/useDashboardTaskEnrichment'
import { useTasks } from '../../tasks/hooks/useTasks'
import { PlusIcon, TasksIcon } from '../../../components/icons'
import type { Task } from '../../tasks/types'

export interface UpcomingTasksWidgetProps {
  onAddTask: () => void
  onOpenEditTask?: (task: Task) => void
  onToggleComplete?: (taskId: string) => void
}

/**
 * Upcoming tasks bento widget: up to 5 available tasks with dashboard row styling.
 */
export function UpcomingTasksWidget({
  onAddTask,
  onOpenEditTask,
  onToggleComplete,
}: UpcomingTasksWidgetProps) {
  const upcomingTasks = useUpcomingTasks()
  const { fetchSubtasks } = useTasks()

  const upcomingIds = useMemo(() => upcomingTasks.map((t) => t.id), [upcomingTasks])
  const enrichment = useDashboardTaskEnrichment(upcomingIds, fetchSubtasks)

  const handleTaskClick = useCallback((task: Task) => onOpenEditTask?.(task), [onOpenEditTask])

  return (
    <DashboardBentoCard
      title="Upcoming Tasks"
      titleIcon={<TasksIcon className="h-6 w-6" />}
      actions={
        <button
          type="button"
          onClick={onAddTask}
          className="rounded-full p-2 text-primary transition-colors hover:bg-surface-container"
          aria-label="Add task"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      }
    >
      {upcomingTasks.length === 0 ? (
        <p className="text-secondary text-on-surface-variant">No upcoming tasks.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {upcomingTasks.map((task) => {
            const rowMeta = enrichment[task.id]
            return (
              <DashboardTaskRow
                key={task.id}
                task={task}
                subtaskSummary={rowMeta?.subtaskSummary ?? null}
                checklistSummary={rowMeta?.checklistSummary ?? null}
                onClick={() => handleTaskClick(task)}
                onToggleComplete={onToggleComplete}
              />
            )
          })}
        </div>
      )}
    </DashboardBentoCard>
  )
}
