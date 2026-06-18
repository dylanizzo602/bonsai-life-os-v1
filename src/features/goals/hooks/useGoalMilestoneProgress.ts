/* useGoalMilestoneProgress: Milestones, task trees, and live goal progress for list/widget views */

import { useEffect, useMemo, useState } from 'react'
import { getMilestonesForGoal, getTaskTreesByMilestoneId } from '../../../lib/supabase/goals'
import type { Task } from '../../tasks/types'
import type { Goal, GoalMilestone } from '../types'
import {
  getActiveGoalCardProgress,
  resolveGoalProgressPercent,
} from '../utils/goalDisplay'
import { aggregateGoalProgressPercent } from '../utils/milestoneProgress'

/**
 * Loads milestones and linked task trees for a goal list, then resolves live progress
 * (matches Goals page bucketing and ActiveGoalCard display rules).
 */
export function useGoalMilestoneProgress(goals: Goal[]) {
  const [milestonesByGoal, setMilestonesByGoal] = useState<Record<string, GoalMilestone[]>>({})
  const [taskTreesByMilestoneId, setTaskTreesByMilestoneId] = useState<Record<string, Task[]>>({})
  const [loading, setLoading] = useState(false)

  /* Fetch milestones and task trees whenever the goal list changes */
  useEffect(() => {
    if (goals.length === 0) {
      setMilestonesByGoal({})
      setTaskTreesByMilestoneId({})
      return
    }

    let cancelled = false

    const fetchMilestones = async () => {
      setLoading(true)
      const milestonesMap: Record<string, GoalMilestone[]> = {}
      const mergedTrees: Record<string, Task[]> = {}

      for (const goal of goals) {
        try {
          const milestones = await getMilestonesForGoal(goal.id)
          milestonesMap[goal.id] = milestones
          const trees = await getTaskTreesByMilestoneId(milestones)
          Object.assign(mergedTrees, trees)
        } catch (err) {
          console.error(`Error fetching milestones for goal ${goal.id}:`, err)
          milestonesMap[goal.id] = []
        }
      }

      if (!cancelled) {
        setMilestonesByGoal(milestonesMap)
        setTaskTreesByMilestoneId(mergedTrees)
        setLoading(false)
      }
    }

    void fetchMilestones()

    return () => {
      cancelled = true
    }
  }, [goals])

  /* Aggregate progress for bucketing (active vs completed) */
  const progressByGoalId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const goal of goals) {
      map[goal.id] = resolveGoalProgressPercent(
        goal,
        milestonesByGoal[goal.id],
        taskTreesByMilestoneId,
        aggregateGoalProgressPercent,
      )
    }
    return map
  }, [goals, milestonesByGoal, taskTreesByMilestoneId])

  /* Card-style display percent (task counts, number milestones, etc.) */
  const displayProgressByGoalId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const goal of goals) {
      const milestones = milestonesByGoal[goal.id] ?? []
      const aggregate = progressByGoalId[goal.id]
      const { percent } = getActiveGoalCardProgress(
        milestones,
        taskTreesByMilestoneId,
        aggregate ?? goal.progress ?? 0,
      )
      map[goal.id] = percent
    }
    return map
  }, [goals, milestonesByGoal, taskTreesByMilestoneId, progressByGoalId])

  return {
    milestonesByGoal,
    taskTreesByMilestoneId,
    progressByGoalId,
    displayProgressByGoalId,
    loading,
  }
}
