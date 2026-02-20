/* useGoals hook: Custom React hook for goal data management and state */
import { useState, useEffect, useCallback } from 'react'
import {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  getMilestonesForGoal,
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
  GoalMilestone,
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
export function useGoal(goalId: string | null) {
  const [goal, setGoal] = useState<GoalWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Fetch goal with details */
  const fetchGoal = useCallback(async () => {
    if (!goalId) {
      setGoal(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getGoal(goalId)
      setGoal(data)
      // #region agent log
      fetch('http://127.0.0.1:7825/ingest/5e4e8d61-5cc8-4de4-815f-8096cfa9d88f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6f20d7'},body:JSON.stringify({sessionId:'6f20d7',location:'useGoals.ts:fetchGoal',message:'goal fetch ok',data:{goalId,goalName:data?.name},timestamp:Date.now(),hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to fetch goal'
      setError(errMsg)
      // #region agent log
      fetch('http://127.0.0.1:7825/ingest/5e4e8d61-5cc8-4de4-815f-8096cfa9d88f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6f20d7'},body:JSON.stringify({sessionId:'6f20d7',location:'useGoals.ts:fetchGoal',message:'goal fetch error',data:{goalId,error:errMsg},timestamp:Date.now(),hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching goal:', err)
    } finally {
      setLoading(false)
    }
  }, [goalId])

  /* Fetch when goalId changes */
  useEffect(() => {
    fetchGoal()
  }, [fetchGoal])

  /* Create a milestone */
  const handleCreateMilestone = useCallback(
    async (input: CreateMilestoneInput) => {
      if (!goalId) return
      try {
        setError(null)
        const newMilestone = await createMilestone(input)
        /* Refetch goal to get updated milestones and progress */
        await fetchGoal()
        return newMilestone
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create milestone'
        setError(errorMessage)
        throw err
      }
    },
    [goalId, fetchGoal],
  )

  /* Update a milestone */
  const handleUpdateMilestone = useCallback(
    async (id: string, input: UpdateMilestoneInput) => {
      if (!goalId) return
      try {
        setError(null)
        const updatedMilestone = await updateMilestone(id, input)
        /* Refetch goal to get updated milestones and progress */
        await fetchGoal()
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
      if (!goalId) return
      try {
        setError(null)
        await deleteMilestone(id)
        /* Refetch goal to get updated milestones and progress */
        await fetchGoal()
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete milestone'
        setError(errorMessage)
        throw err
      }
    },
    [goalId, fetchGoal],
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
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to link habit'
        setError(errorMessage)
        throw err
      }
    },
    [goalId, fetchGoal],
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
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to unlink habit'
        setError(errorMessage)
        throw err
      }
    },
    [goalId, fetchGoal],
  )

  /* Fetch goal history */
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

  /* Fetch history when goalId changes */
  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleUpdateGoal = useCallback(
    async (id: string, input: UpdateGoalInput) => {
      try {
        setError(null)
        const updatedGoal = await updateGoal(id, input)
        setGoal(updatedGoal as GoalWithDetails)
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

  /* Recalculate progress from milestones */
  const handleRecalculateProgress = useCallback(async () => {
    if (!goalId) return
    try {
      setError(null)
      await calculateGoalProgress(goalId)
      await fetchGoal()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to recalculate progress'
      setError(errorMessage)
      throw err
    }
  }, [goalId, fetchGoal])

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
    recalculateProgress: handleRecalculateProgress,
  }
}
