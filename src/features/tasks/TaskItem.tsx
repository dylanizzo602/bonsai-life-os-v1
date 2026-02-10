/* TaskItem component: Individual task card displaying task details and actions */
import { useState } from 'react'
import { Checkbox } from '../../components/Checkbox'
import { Button } from '../../components/Button'
import { SubtaskList } from './SubtaskList'
import type { Task, Subtask } from './types'

interface TaskItemProps {
  /** Task data to display */
  task: Task
  /** Function to toggle task completion */
  onToggleComplete: (id: string, completed: boolean) => Promise<void>
  /** Function to delete task */
  onDelete: (id: string) => Promise<void>
  /** Function to edit task */
  onEdit: (task: Task) => void
  /** Function to fetch subtasks */
  fetchSubtasks: (taskId: string) => Promise<Subtask[]>
  /** Function to create subtask */
  onCreateSubtask: (taskId: string, title: string) => Promise<Subtask>
  /** Function to update subtask */
  onUpdateSubtask: (
    id: string,
    updates: Partial<Pick<Subtask, 'title' | 'completed'>>,
  ) => Promise<Subtask>
  /** Function to delete subtask */
  onDeleteSubtask: (id: string) => Promise<void>
  /** Function to toggle subtask completion */
  onToggleSubtaskComplete: (id: string, completed: boolean) => Promise<Subtask>
}

/**
 * Component for displaying a single task with its details
 * Shows task info, completion status, priority, due date, and subtasks
 */
export function TaskItem({
  task,
  onToggleComplete,
  onDelete,
  onEdit,
  fetchSubtasks,
  onCreateSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onToggleSubtaskComplete,
}: TaskItemProps) {
  const [showSubtasks, setShowSubtasks] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Format due date for display
  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const taskDate = new Date(date)
    taskDate.setHours(0, 0, 0, 0)

    if (taskDate < today) {
      return { text: date.toLocaleDateString(), className: 'text-red-600 font-semibold' }
    } else if (taskDate.getTime() === today.getTime()) {
      return { text: 'Today', className: 'text-blue-600 font-semibold' }
    } else {
      return { text: date.toLocaleDateString(), className: 'text-gray-600' }
    }
  }

  const dueDateInfo = formatDueDate(task.due_date)
  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  }

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        task.status === 'completed' ? 'bg-gray-50 opacity-75' : 'bg-white'
      }`}
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
                  task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                }`}
              >
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Priority badge */}
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${priorityColors[task.priority]}`}
              >
                {task.priority}
              </span>
              {/* Category badge */}
              {task.category && (
                <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                  {task.category}
                </span>
              )}
            </div>
          </div>

          {/* Due date and metadata */}
          <div className="flex items-center gap-4 mt-2 text-sm">
            {dueDateInfo && (
              <span className={dueDateInfo.className}>{dueDateInfo.text}</span>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {expanded ? 'Hide details' : 'Show details'}
            </button>
          </div>
        </div>

        {/* Action buttons */}
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

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {/* Subtasks section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Subtasks</h4>
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
                onUpdateSubtask={onUpdateSubtask}
                onDeleteSubtask={onDeleteSubtask}
                onToggleComplete={onToggleSubtaskComplete}
              />
            )}
          </div>

          {/* Task metadata */}
          <div className="text-xs text-gray-500 space-y-1">
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
