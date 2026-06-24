/* useGoalMilestoneProgress: Milestones, task trees, and live goal progress for list/widget views */

import { useEffect, useMemo, useState } from 'react'
import { getMilestonesByGoalIds, getTaskTreesByMilestoneId } from '../../../lib/supabase/goals'
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
      try {
        const goalIds = goals.map((g) => g.id)
        const milestonesMap = await getMilestonesByGoalIds(goalIds)
        for (const goal of goals) {
          if (!milestonesMap[goal.id]) {
            milestonesMap[goal.id] = []
          }
        }
        const allMilestones = Object.values(milestonesMap).flat()
        const mergedTrees = await getTaskTreesByMilestoneId(allMilestones)

        if (!cancelled) {
          setMilestonesByGoal(milestonesMap)
          setTaskTreesByMilestoneId(mergedTrees)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error fetching milestones for goals:', err)
        if (!cancelled) {
          const emptyMap: Record<string, GoalMilestone[]> = {}
          for (const goal of goals) {
            emptyMap[goal.id] = []
          }
          setMilestonesByGoal(emptyMap)
          setTaskTreesByMilestoneId({})
          setLoading(false)
        }
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
