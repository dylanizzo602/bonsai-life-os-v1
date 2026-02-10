/* TaskList component: Main task management interface with task list and CRUD */
import { FullTaskItem } from './FullTaskItem'
import type { Task, TaskFilters } from './types'

export interface TaskListProps {
  /** Tasks from useTasks */
  tasks: Task[]
  /** Loading state */
  loading: boolean
  /** Error message */
  error: string | null
  /** Current filters */
  filters: TaskFilters
  /** Update filters */
  setFilters: (f: TaskFilters) => void
  /** Update task */
  updateTask: (id: string, input: import('./types').UpdateTaskInput) => Promise<Task>
  /** Delete task */
  deleteTask: (id: string) => Promise<void>
  /** Toggle task completion (returns updated task for subtask list state) */
  toggleComplete: (id: string, completed: boolean) => Promise<Task>
  /** Fetch subtasks for a task */
  fetchSubtasks: (taskId: string) => Promise<Task[]>
  /** Create subtask */
  createSubtask: (parentId: string, input: { title: string }) => Promise<Task>
  /** Callback when user clicks to add a new task */
  onOpenAddModal?: () => void
  /** Callback when user clicks to edit a task */
  onOpenEditModal?: (task: Task) => void
}

/**
 * Task list with filtering and task cards.
 * Receives all data and handlers from parent (TasksPage via useTasks).
 */
export function TaskList({
  tasks,
  loading,
  error,
  filters,
  setFilters,
  onOpenAddModal,
  onOpenEditModal,
  /* Rest kept for interface; used when SubtaskList/FullTaskItem need them */
  updateTask: _updateTask,
  deleteTask: _deleteTask,
  toggleComplete: _toggleComplete,
  fetchSubtasks: _fetchSubtasks,
  createSubtask: _createSubtask,
}: TaskListProps) {
  return (
    <div className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8 text-bonsai-slate-500">Loading tasks...</div>
      )}

      {/* Empty state */}
      {!loading && tasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-bonsai-slate-600 text-lg">No tasks found</p>
          <p className="text-bonsai-slate-500 text-sm mt-2">
            Create your first task to get started
          </p>
        </div>
      )}

      {/* Task list: FullTaskItem only on desktop (lg); tablet/mobile task view not built yet */}
      {!loading && tasks.length > 0 && (
        <>
          <div className="hidden lg:block space-y-4">
            {tasks.map((task) => (
              <FullTaskItem
                key={task.id}
                task={task}
                onClick={() => onOpenEditModal?.(task)}
                hasSubtasks={false}
              />
            ))}
          </div>
          {/* Tablet/mobile: no task component yet */}
          <div className="lg:hidden rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50 px-4 py-8 text-center text-bonsai-slate-600">
            Task list is available on desktop view.
          </div>
        </>
      )}
    </div>
  )
}
