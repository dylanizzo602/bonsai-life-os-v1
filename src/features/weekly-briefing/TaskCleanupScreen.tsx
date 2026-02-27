/* TaskCleanupScreen: Weekly briefing step 3 – review tasks with no date/priority and cut away noise */

import { Button } from '../../components/Button'
import type { Task } from '../tasks/types'

interface TaskCleanupScreenProps {
  /** Tasks that have no due date or no priority (active/in_progress only) */
  tasksToReview: Task[]
  /** Open edit modal for this task (parent renders AddEditTaskModal) */
  onEditTask: (task: Task) => void
  /** Archive this task */
  onArchiveTask: (task: Task) => void
  /** Delete this task */
  onDeleteTask: (task: Task) => void
  /** Finish weekly briefing */
  onFinish: () => void
}

/**
 * Task cleanup step: "Review tasks."
 * Lists tasks with no due date or no priority; user can set date/priority, archive, or delete to cut away noise.
 */
export function TaskCleanupScreen({
  tasksToReview,
  onEditTask,
  onArchiveTask,
  onDeleteTask,
  onFinish,
}: TaskCleanupScreenProps) {
  const handleArchive = (task: Task) => {
    if (window.confirm(`Archive "${task.title}"?`)) onArchiveTask(task)
  }

  const handleDelete = (task: Task) => {
    if (window.confirm(`Delete "${task.title}"? This cannot be undone.`)) onDeleteTask(task)
  }

  return (
    <div className="flex min-h-[50vh] flex-col justify-between">
      <div>
        {/* Heading */}
        <h2 className="text-page-title font-bold text-bonsai-brown-700 mb-4">
          Review tasks.
        </h2>
        <p className="text-body text-bonsai-slate-700 mb-6">
          These tasks have no due date or no priority. Set a date and priority, or remove what you don&apos;t need.
        </p>

        {/* Task list or empty state */}
        {tasksToReview.length === 0 ? (
          <div className="rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50/50 p-6">
            <p className="text-body text-bonsai-slate-600">
              No tasks need review. You&apos;re all set.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {tasksToReview.map((task) => (
              <li
                key={task.id}
                className="flex flex-col gap-2 rounded-lg border border-bonsai-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium text-bonsai-brown-700 truncate">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-secondary text-bonsai-slate-600 line-clamp-2 mt-0.5">
                      {task.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onEditTask(task)}
                  >
                    Set due date & priority
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchive(task)}
                  >
                    Archive
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(task)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Finish button */}
      <div className="mt-8">
        <Button type="button" onClick={onFinish} variant="primary" className="w-full">
          Finish
        </Button>
      </div>
    </div>
  )
}
