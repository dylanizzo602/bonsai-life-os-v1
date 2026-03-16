/* useTasks hook: Custom React hook for task data management and state */
import { useState, useEffect, useCallback } from 'react'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  getSubtasks,
  createSubtask,
  getTaskDependencies,
  createTaskDependency,
  deleteTaskDependency,
} from '../../../lib/supabase/tasks'
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
} from '../types'

/**
 * Custom hook for managing tasks and subtasks.
 * Provides state management, loading states, and CRUD operations.
 */
export function useTasks(initialFilters?: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TaskFilters>(initialFilters ?? {})

  /* Fetch tasks with current filters */
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getTasks(filters)
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  /* Initial fetch and refetch when filters change */
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  /* Create a new task */
  const handleCreateTask = useCallback(
    async (input: CreateTaskInput) => {
      try {
        setError(null)
        const newTask = await createTask(input)
        setTasks((prev) => [newTask, ...prev])
        return newTask
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create task'
        setError(errorMessage)
        throw err
      }
    },
    [],
  )

  /* Update an existing task and keep top-level vs subtask visibility consistent in the main list */
  const handleUpdateTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    try {
      setError(null)
      const updatedTask = await updateTask(id, input)
      /* Update task list:
       * - When present, replace the task and, if it just became a subtask (parent_id set), remove it from the top-level list.
       * - When a previously hidden task (e.g. subtask) becomes top-level (parent_id cleared), insert it into the main list. */
      setTasks((prev) => {
        const previousTask = prev.find((task) => task.id === id)
        const exists = Boolean(previousTask)

        if (exists) {
          /* If a top-level task was just linked as a subtask, remove it from the main list so it only appears under its parent. */
          if (previousTask?.parent_id === null && updatedTask.parent_id !== null) {
            return prev.filter((task) => task.id !== id)
          }
          return prev.map((task) => (task.id === id ? updatedTask : task))
        }

        if (updatedTask.parent_id === null && updatedTask.status !== 'deleted') {
          return [updatedTask, ...prev]
        }
        return prev
      })
      return updatedTask
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update task'
      setError(errorMessage)
      throw err
    }
  }, [])

  /* Delete a task */
  const handleDeleteTask = useCallback(async (id: string) => {
    try {
      setError(null)
      await deleteTask(id)
      setTasks((prev) => prev.filter((task) => task.id !== id))
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete task'
      setError(errorMessage)
      throw err
    }
  }, [])

  /* Toggle task completion */
  const handleToggleComplete = useCallback(async (id: string, completed: boolean) => {
    try {
      setError(null)
      const updatedTask = await toggleTaskComplete(id, completed)
      setTasks((prev) => prev.map((task) => (task.id === id ? updatedTask : task)))
      return updatedTask
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to toggle task'
      setError(errorMessage)
      throw err
    }
  }, [])

  /* Fetch subtasks for a task (tasks with parent_id = taskId) */
  const fetchSubtasks = useCallback(async (taskId: string): Promise<Task[]> => {
    try {
      return await getSubtasks(taskId)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch subtasks'
      setError(errorMessage)
      throw err
    }
  }, [])

  /* Create a subtask (task with parent_id) */
  const handleCreateSubtask = useCallback(
    async (parentId: string, input: Omit<CreateTaskInput, 'parent_id'>) => {
      try {
        setError(null)
        return await createSubtask(parentId, input)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create subtask'
        setError(errorMessage)
        throw err
      }
    },
    [],
  )

  /* Fetch tasks for dependency picker (all tasks including subtasks for linking) */
  const getTasksForPicker = useCallback(async (): Promise<Task[]> => {
    return getTasks({ includeAllTasks: true })
  }, [])

  /* Create a task dependency */
  const handleAddDependency = useCallback(
    async (input: { blocker_id: string; blocked_id: string }) => {
      await createTaskDependency(input)
    },
    [],
  )

  /* Remove a task dependency by id */
  const handleRemoveDependency = useCallback(async (dependencyId: string) => {
    await deleteTaskDependency(dependencyId)
  }, [])

  return {
    tasks,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchTasks,
    createTask: handleCreateTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    toggleComplete: handleToggleComplete,
    fetchSubtasks,
    createSubtask: handleCreateSubtask,
    getTasks: getTasksForPicker,
    getTaskDependencies,
    onAddDependency: handleAddDependency,
    onRemoveDependency: handleRemoveDependency,
  }
}
