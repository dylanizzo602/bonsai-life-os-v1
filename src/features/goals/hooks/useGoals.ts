/* useGoals hook: Custom React hook for goal data management and state */
import { useState, useEffect, useCallback } from 'react'
import {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  linkHabitToGoal,
  unlinkHabitFromGoal,
  getGoalHistory,
  calculateGoalProgress,
} from '../../../lib/supabase/goals'
import type {
  Goal,
  GoalHistory,
  GoalWithDetails,
  CreateGoalInput,
  UpdateGoalInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '../types'

/**
 * Custom hook for managing goals, milestones, habit links, and history.
 * Provides state management, loading states, and CRUD operations.
 */
export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Fetch all goals */
  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getGoals()
      setGoals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals')
      console.error('Error fetching goals:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /* Initial fetch */
  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  /* Create a new goal */
  const handleCreateGoal = useCallback(
    async (input: CreateGoalInput) => {
      try {
        setError(null)
        const newGoal = await createGoal(input)
        setGoals((prev) => [newGoal, ...prev])
        return newGoal
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create goal'
        setError(errorMessage)
        throw err
      }
    },
    [],
  )

  /* Update an existing goal */
  const handleUpdateGoal = useCallback(
    async (id: string, input: UpdateGoalInput) => {
      try {
        setError(null)
        const updatedGoal = await updateGoal(id, input)
        setGoals((prev) => prev.map((g) => (g.id === id ? updatedGoal : g)))
        return updatedGoal
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update goal'
        setError(errorMessage)
        throw err
      }
    },
    [],
  )

  /* Delete a goal */
  const handleDeleteGoal = useCallback(
    async (id: string) => {
      try {
        setError(null)
        await deleteGoal(id)
        setGoals((prev) => prev.filter((g) => g.id !== id))
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete goal'
        setError(errorMessage)
        throw err
      }
    },
    [],
  )

  return {
    goals,
    loading,
    error,
    refetch: fetchGoals,
    createGoal: handleCreateGoal,
    updateGoal: handleUpdateGoal,
    deleteGoal: handleDeleteGoal,
  }
}

/**
 * Custom hook for managing a single goal with details (milestones, habits, history).
 */
export function useGoal(goalId: string) {
  const [goal, setGoal] = useState<GoalWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Fetch goal with details */
  const fetchGoal = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getGoal(goalId)
      setGoal(data)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to fetch goal'
      setError(errMsg)
      console.error('Error fetching goal:', err)
    } finally {
      setLoading(false)
    }
  }, [goalId])

  /* Fetch when goalId changes */
  useEffect(() => {
    fetchGoal()
  }, [fetchGoal])

  /* Goal history list (declared before milestone handlers so they can refresh the timeline) */
  const [history, setHistory] = useState<GoalHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchHistory = useCallback(async () => {
    if (!goalId) {
      setHistory([])
      return
    }

    try {
      setHistoryLoading(true)
      const data = await getGoalHistory(goalId)
      setHistory(data)
    } catch (err) {
      console.error('Error fetching goal history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }, [goalId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  /* Create a milestone */
  const handleCreateMilestone = useCallback(
    async (input: CreateMilestoneInput) => {
      try {
        setError(null)
        const newMilestone = await createMilestone(input)
        /* Refetch goal and history so timeline shows the new milestone entry */
        await fetchGoal()
        await fetchHistory()
        return newMilestone
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create milestone'
        setError(errorMessage)
        throw err
      }
    },
    [fetchGoal, fetchHistory],
  )

  /* Update a milestone */
  const handleUpdateMilestone = useCallback(
    async (id: string, input: UpdateMilestoneInput) => {
      try {
        setError(null)
        const updatedMilestone = await updateMilestone(id, input)
        /* Refetch goal and history so milestone diffs and progress appear in the timeline */
        await fetchGoal()
        await fetchHistory()
        return updatedMilestone
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update milestone'
        setError(errorMessage)
        throw err
      }
    },
    [goalId, fetchGoal],
  )

  /* Delete a milestone */
  const handleDeleteMilestone = useCallback(
    async (id: string) => {
      try {
        setError(null)
        await deleteMilestone(id)
        await fetchGoal()
        await fetchHistory()
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete milestone'
        setError(errorMessage)
        throw err
      }
    },
    [fetchGoal, fetchHistory],
  )

  /* Link habit to goal */
  const handleLinkHabit = useCallback(
    async (habitId: string) => {
      if (!goalId) return
      try {
        setError(null)
        await linkHabitToGoal(goalId, habitId)
        /* Refetch goal to get updated linked habits */
        await fetchGoal()
        await fetchHistory()
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to link habit'
        setError(errorMessage)
        throw err
      }
    },
    [goalId, fetchGoal, fetchHistory],
  )

  /* Unlink habit from goal */
  const handleUnlinkHabit = useCallback(
    async (habitId: string) => {
      if (!goalId) return
      try {
        setError(null)
        await unlinkHabitFromGoal(goalId, habitId)
        /* Refetch goal to get updated linked habits */
        await fetchGoal()
        await fetchHistory()
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to unlink habit'
        setError(errorMessage)
        throw err
      }
    },
    [goalId, fetchGoal, fetchHistory],
  )

  const handleUpdateGoal = useCallback(
    async (id: string, input: UpdateGoalInput) => {
      try {
        setError(null)
        /* Persist updated goal fields in Supabase */
        const updatedGoal = await updateGoal(id, input)
        /* Refetch full goal details so milestones, linked habits, and computed_progress stay in sync */
        await fetchGoal()
        await fetchHistory()
        return updatedGoal
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update goal'
        setError(errorMessage)
        throw err
      }
    },
    [fetchGoal, fetchHistory],
  )

  /* Delete goal: calls Supabase deleteGoal; caller should navigate back after success */
  const handleDeleteGoal = useCallback(
    async (id: string) => {
      try {
        setError(null)
        await deleteGoal(id)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete goal'
        setError(errorMessage)
        throw err
      }
    },
    [],
  )

  /* Recalculate progress from milestones */
  const handleRecalculateProgress = useCallback(async () => {
    if (!goalId) return
    try {
      setError(null)
      await calculateGoalProgress(goalId)
      await fetchGoal()
      await fetchHistory()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to recalculate progress'
      setError(errorMessage)
      throw err
    }
  }, [goalId, fetchGoal, fetchHistory])

  return {
    goal,
    loading,
    error,
    refetch: fetchGoal,
    createMilestone: handleCreateMilestone,
    updateMilestone: handleUpdateMilestone,
    deleteMilestone: handleDeleteMilestone,
    linkHabit: handleLinkHabit,
    unlinkHabit: handleUnlinkHabit,
    history,
    historyLoading,
    refetchHistory: fetchHistory,
    updateGoal: handleUpdateGoal,
    deleteGoal: handleDeleteGoal,
    recalculateProgress: handleRecalculateProgress,
  }
}
