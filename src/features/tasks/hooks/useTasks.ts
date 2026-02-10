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
  updateSubtask,
  deleteSubtask,
  toggleSubtaskComplete,
} from '../../../lib/supabase/tasks'
import type {
  Task,
  Subtask,
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubtaskInput,
  TaskFilters,
} from '../types'

/**
 * Custom hook for managing tasks and subtasks
 * Provides state management, loading states, and CRUD operations
 */
export function useTasks(initialFilters?: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TaskFilters>(initialFilters ?? {})

  // Fetch tasks with current filters
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

  // Initial fetch and refetch when filters change
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Create a new task
  const handleCreateTask = useCallback(
    async (input: CreateTaskInput) => {
      try {
        setError(null)
        const newTask = await createTask(input)
        setTasks((prev) => [newTask, ...prev])
        return newTask
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create task'
        setError(errorMessage)
        throw err
      }
    },
    [],
  )

  // Update an existing task
  const handleUpdateTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    try {
      setError(null)
      const updatedTask = await updateTask(id, input)
      setTasks((prev) => prev.map((task) => (task.id === id ? updatedTask : task)))
      return updatedTask
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Delete a task
  const handleDeleteTask = useCallback(async (id: string) => {
    try {
      setError(null)
      await deleteTask(id)
      setTasks((prev) => prev.filter((task) => task.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Toggle task completion
  const handleToggleComplete = useCallback(async (id: string, completed: boolean) => {
    try {
      setError(null)
      const updatedTask = await toggleTaskComplete(id, completed)
      setTasks((prev) => prev.map((task) => (task.id === id ? updatedTask : task)))
      return updatedTask
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle task'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Fetch subtasks for a task
  const fetchSubtasks = useCallback(async (taskId: string): Promise<Subtask[]> => {
    try {
      return await getSubtasks(taskId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subtasks'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Create a subtask
  const handleCreateSubtask = useCallback(async (input: CreateSubtaskInput) => {
    try {
      setError(null)
      return await createSubtask(input)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subtask'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Update a subtask
  const handleUpdateSubtask = useCallback(
    async (id: string, updates: Partial<Pick<Subtask, 'title' | 'completed'>>) => {
      try {
        setError(null)
        return await updateSubtask(id, updates)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update subtask'
        setError(errorMessage)
        throw err
      }
    },
    [],
  )

  // Delete a subtask
  const handleDeleteSubtask = useCallback(async (id: string) => {
    try {
      setError(null)
      await deleteSubtask(id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete subtask'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Toggle subtask completion
  const handleToggleSubtaskComplete = useCallback(
    async (id: string, completed: boolean) => {
      try {
        setError(null)
        return await toggleSubtaskComplete(id, completed)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to toggle subtask'
        setError(errorMessage)
        throw err
      }
    },
    [],
  )

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
    updateSubtask: handleUpdateSubtask,
    deleteSubtask: handleDeleteSubtask,
    toggleSubtaskComplete: handleToggleSubtaskComplete,
  }
}
