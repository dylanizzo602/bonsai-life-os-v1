/* TaskList component: Main task management interface with task list and CRUD */
import { useState, useEffect } from 'react'
import { FullTaskItem } from './FullTaskItem'
import { SubtaskList } from './SubtaskList'
import { getTaskChecklists, getTaskChecklistItems, getTaskDependencies } from '../../lib/supabase/tasks'
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
  /** Refetch tasks (e.g. after tag updates) */
  refetch?: () => void
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
  /** Fetch all tasks (for dependency modal) */
  getTasks?: () => Promise<Task[]>
  /** Fetch task dependencies */
  getTaskDependencies?: (taskId: string) => Promise<{
    blocking: import('./types').TaskDependency[]
    blockedBy: import('./types').TaskDependency[]
  }>
  /** Create a task dependency */
  onAddDependency?: (input: import('./types').CreateTaskDependencyInput) => Promise<void>
  /** Remove a task dependency by id */
  onRemoveDependency?: (dependencyId: string) => Promise<void>
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
  refetch,
  onOpenAddModal,
  onOpenEditModal,
  /* Rest kept for interface; used when SubtaskList/FullTaskItem need them */
  updateTask,
  deleteTask,
  toggleComplete,
  fetchSubtasks,
  createSubtask,
  getTasks,
  getTaskDependencies,
  onAddDependency,
  onRemoveDependency,
}: TaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [enrichmentLoading, setEnrichmentLoading] = useState(false)
  const [taskEnrichment, setTaskEnrichment] = useState<Record<string, {
    checklistSummary?: { completed: number; total: number }
    hasSubtasks: boolean
    isBlocked: boolean
    isBlocking: boolean
    blockingCount: number
    blockedByCount: number
  }>>({})

  /* Fetch enrichment data for all tasks: checklists, subtask counts, dependencies */
  const loadEnrichment = async () => {
    if (!fetchSubtasks) return
    setEnrichmentLoading(true)
    const enrichment: typeof taskEnrichment = {}
    try {
      await Promise.all(
        tasks.map(async (task) => {
          try {
            const [checklists, subtasksResult, deps] = await Promise.all([
              getTaskChecklists(task.id).catch((err) => {
                console.error(`Error fetching checklists for task ${task.id}:`, err)
                return []
              }),
              fetchSubtasks(task.id).catch((err) => {
                console.error(`Error fetching subtasks for task ${task.id}:`, err)
                return []
              }),
              getTaskDependencies(task.id).catch((err) => {
                console.error(`Error fetching dependencies for task ${task.id}:`, err)
                return { blocking: [], blockedBy: [] }
              }),
            ])
            const subtasks = Array.isArray(subtasksResult) ? subtasksResult : []
            let completed = 0
            let total = 0
            for (const c of checklists) {
              const items = await getTaskChecklistItems(c.id).catch(() => [])
              total += items.length
              completed += items.filter((i) => i.completed).length
            }
            enrichment[task.id] = {
              checklistSummary: total > 0 ? { completed, total } : undefined,
              hasSubtasks: subtasks.length > 0,
              isBlocked: deps.blockedBy.length > 0,
              isBlocking: deps.blocking.length > 0,
              blockingCount: deps.blocking.length,
              blockedByCount: deps.blockedBy.length,
            }
          } catch (err) {
            console.error(`Error loading enrichment for task ${task.id}:`, err)
            enrichment[task.id] = {
              hasSubtasks: false,
              isBlocked: false,
              isBlocking: false,
              blockingCount: 0,
              blockedByCount: 0,
            }
          }
        }),
      )
      setTaskEnrichment(enrichment)
    } finally {
      setEnrichmentLoading(false)
    }
  }

  useEffect(() => {
    if (tasks.length > 0 && fetchSubtasks) {
      loadEnrichment()
    } else {
      setTaskEnrichment({})
      setEnrichmentLoading(false)
    }
  }, [tasks, fetchSubtasks])

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

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
            {tasks.map((task) => {
              const enrichment = taskEnrichment[task.id] ?? {
                hasSubtasks: false,
                isBlocked: false,
                isBlocking: false,
                blockingCount: 0,
                blockedByCount: 0,
              }
              const isExpanded = expandedTasks.has(task.id)
              return (
                <div key={task.id} className="space-y-2">
                  <FullTaskItem
                    task={task}
                    onClick={() => onOpenEditModal?.(task)}
                    hasSubtasks={enrichment.hasSubtasks}
                    checklistSummary={enrichment.checklistSummary}
                    isBlocked={enrichment.isBlocked}
                    isBlocking={enrichment.isBlocking}
                    blockingCount={enrichment.blockingCount}
                    blockedByCount={enrichment.blockedByCount}
                    expanded={isExpanded}
                    onToggleExpand={() => toggleExpand(task.id)}
                    onTagsUpdated={refetch}
                    onUpdateStatus={async (taskId, status) => {
                      try {
                        await updateTask(taskId, { status })
                      } catch (error) {
                        console.error('Failed to update task status:', error)
                        throw error // Re-throw so FullTaskItem can handle it
                      }
                    }}
                    onUpdateTask={async (taskId, input) => {
                      try {
                        await updateTask(taskId, input)
                      } catch (error) {
                        console.error('Failed to update task:', error)
                        throw error // Re-throw so FullTaskItem can handle it
                      }
                    }}
                  />
                  {isExpanded && enrichment.hasSubtasks && fetchSubtasks && createSubtask && updateTask && deleteTask && toggleComplete && (
                    <div className="ml-8 pl-4 border-l-2 border-bonsai-slate-200">
                      <SubtaskList
                        taskId={task.id}
                        fetchSubtasks={fetchSubtasks}
                        onCreateSubtask={(taskId, title) => createSubtask(taskId, { title })}
                        onUpdateTask={updateTask}
                        onDeleteTask={deleteTask}
                        onToggleComplete={toggleComplete}
                        getTasks={getTasks}
                        getTaskDependencies={getTaskDependencies}
                        onAddDependency={onAddDependency}
                        onRemoveDependency={onRemoveDependency}
                      />
                    </div>
                  )}
                </div>
              )
            })}
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
