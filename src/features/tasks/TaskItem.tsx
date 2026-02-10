/* TaskItem component: Individual task card with details and subtasks */
import { useState } from 'react'
import { Checkbox } from '../../components/Checkbox'
import { Button } from '../../components/Button'
import { SubtaskList } from './SubtaskList'
import type { Task } from './types'

interface TaskItemProps {
  /** Task data to display */
  task: Task
  /** Toggle task completion */
  onToggleComplete: (id: string, completed: boolean) => Promise<unknown>
  /** Delete task */
  onDelete: (id: string) => Promise<void>
  /** Edit task (opens edit modal) */
  onEdit: (task: Task) => void
  /** Fetch subtasks (tasks with parent_id = task.id) */
  fetchSubtasks: (taskId: string) => Promise<Task[]>
  /** Create subtask (task with parent_id) */
  onCreateSubtask: (taskId: string, title: string) => Promise<Task>
  /** Update task (used for subtask title edits) */
  onUpdateTask: (id: string, updates: { title?: string }) => Promise<Task>
  /** Delete task (used for subtasks) */
  onDeleteTask: (id: string) => Promise<void>
  /** Toggle completion (used for subtasks) */
  onToggleSubtaskComplete: (id: string, completed: boolean) => Promise<Task>
}

/**
 * Single task card with completion, priority, due date, and expandable subtasks.
 */
export function TaskItem({
  task,
  onToggleComplete,
  onDelete,
  onEdit,
  fetchSubtasks,
  onCreateSubtask,
  onUpdateTask,
  onDeleteTask,
  onToggleSubtaskComplete,
}: TaskItemProps) {
  const [showSubtasks, setShowSubtasks] = useState(false)
  const [expanded, setExpanded] = useState(false)

  /* Format due date for display */
  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const taskDate = new Date(date)
    taskDate.setHours(0, 0, 0, 0)
    if (taskDate < today) {
      return { text: date.toLocaleDateString(), className: 'text-red-600 font-semibold' }
    }
    if (taskDate.getTime() === today.getTime()) {
      return { text: 'Today', className: 'text-bonsai-sage-600 font-semibold' }
    }
    return { text: date.toLocaleDateString(), className: 'text-bonsai-slate-600' }
  }

  const dueDateInfo = formatDueDate(task.due_date)
  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  }

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        task.status === 'completed' ? 'bg-bonsai-slate-50 opacity-75' : 'bg-white'
      } border-bonsai-slate-200`}
    >
      {/* Task header */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.status === 'completed'}
          onChange={(e) => onToggleComplete(task.id, e.target.checked)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3
                className={`font-medium ${
                  task.status === 'completed'
                    ? 'line-through text-bonsai-slate-500'
                    : 'text-bonsai-brown-700'
                }`}
              >
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-bonsai-slate-600 mt-1">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${priorityColors[task.priority]}`}
              >
                {task.priority}
              </span>
              {task.tag && (
                <span className="px-2 py-1 text-xs font-medium rounded bg-bonsai-slate-100 text-bonsai-slate-700">
                  {task.tag}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm">
            {dueDateInfo && (
              <span className={dueDateInfo.className}>{dueDateInfo.text}</span>
            )}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-bonsai-sage-600 hover:text-bonsai-sage-700 text-sm"
            >
              {expanded ? 'Hide details' : 'Show details'}
            </button>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            onClick={() => onEdit(task)}
            size="sm"
            variant="ghost"
            title="Edit task"
          >
            ✏️
          </Button>
          <Button
            onClick={() => onDelete(task.id)}
            size="sm"
            variant="danger"
            title="Delete task"
          >
            🗑️
          </Button>
        </div>
      </div>

      {/* Expanded details with subtasks */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-bonsai-slate-200">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-bonsai-slate-700">Subtasks</h4>
              <Button
                onClick={() => setShowSubtasks(!showSubtasks)}
                size="sm"
                variant="ghost"
              >
                {showSubtasks ? 'Hide' : 'Show'} subtasks
              </Button>
            </div>
            {showSubtasks && (
              <SubtaskList
                taskId={task.id}
                fetchSubtasks={fetchSubtasks}
                onCreateSubtask={onCreateSubtask}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onToggleComplete={onToggleSubtaskComplete}
              />
            )}
          </div>
          <div className="text-xs text-bonsai-slate-500 space-y-1">
            <div>Created: {new Date(task.created_at).toLocaleString()}</div>
            {task.updated_at !== task.created_at && (
              <div>Updated: {new Date(task.updated_at).toLocaleString()}</div>
            )}
            {task.completed_at && (
              <div>Completed: {new Date(task.completed_at).toLocaleString()}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
