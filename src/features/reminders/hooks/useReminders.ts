/* useReminders hook: Custom React hook for reminder data and CRUD */
import { useState, useEffect, useCallback } from 'react'
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminderComplete,
} from '../../../lib/supabase/reminders'
import type { Reminder, CreateReminderInput, UpdateReminderInput } from '../types'

/**
 * Custom hook for managing reminders.
 * Provides list state, loading/error, refetch, and CRUD operations.
 */
export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Fetch reminders */
  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getReminders()
      setReminders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reminders')
      console.error('Error fetching reminders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /* Initial fetch */
  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  /* Create a new reminder */
  const handleCreateReminder = useCallback(
    async (input: CreateReminderInput) => {
      try {
        setError(null)
        const newReminder = await createReminder(input)
        setReminders((prev) => [newReminder, ...prev])
        return newReminder
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create reminder'
        setError(errorMessage)
        throw err
      }
    },
    [],
  )

  /* Update an existing reminder */
  const handleUpdateReminder = useCallback(async (id: string, input: UpdateReminderInput) => {
    try {
      setError(null)
      const updated = await updateReminder(id, input)
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)))
      return updated
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update reminder'
      setError(errorMessage)
      throw err
    }
  }, [])

  /* Delete a reminder */
  const handleDeleteReminder = useCallback(async (id: string) => {
    try {
      setError(null)
      await deleteReminder(id)
      setReminders((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete reminder'
      setError(errorMessage)
      throw err
    }
  }, [])

  /* Toggle reminder completion */
  const handleToggleComplete = useCallback(async (id: string, completed: boolean) => {
    try {
      setError(null)
      const updated = await toggleReminderComplete(id, completed)
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)))
      return updated
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to toggle reminder'
      setError(errorMessage)
      throw err
    }
  }, [])

  return {
    reminders,
    loading,
    error,
    refetch: fetchReminders,
    createReminder: handleCreateReminder,
    updateReminder: handleUpdateReminder,
    deleteReminder: handleDeleteReminder,
    toggleComplete: handleToggleComplete,
  }
}
