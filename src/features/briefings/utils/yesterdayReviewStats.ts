/* Yesterday in Review stats: tasks completed, habit consistency, milestones */

import { DateTime } from 'luxon'
import type { Task } from '../../tasks/types'
import type { HabitEntry } from '../../habits/types'
import type { HabitWithStreaks } from '../../habits/types'
import { getHabitsScheduledOnDate } from './yesterdayHabitBreakdown'

export interface YesterdayReviewStats {
  tasksCompleted: number
  habitConsistencyPercent: number
  milestonesReached: number
  hasScheduledHabitsYesterday: boolean
}

function isCompletedOnYMD(completedAt: string | null, ymd: string, timeZone: string): boolean {
  if (!completedAt) return false
  const dt = DateTime.fromISO(completedAt, { setZone: true }).setZone(timeZone)
  return dt.isValid && dt.toISODate() === ymd
}

/** Compute celebratory stats for the clean review path */
export function computeYesterdayReviewStats(
  tasks: Task[],
  habits: HabitWithStreaks[],
  entriesByHabit: Record<string, HabitEntry[]>,
  yesterdayYMD: string,
  timeZone: string,
  milestonesReached: number,
): YesterdayReviewStats {
  const tasksCompleted = tasks.filter(
    (t) => t.status === 'completed' && isCompletedOnYMD(t.completed_at, yesterdayYMD, timeZone),
  ).length

  const scheduled = getHabitsScheduledOnDate(habits, yesterdayYMD)
  let maintained = 0
  for (const habit of scheduled) {
    const entry = (entriesByHabit[habit.id] ?? []).find((e) => e.entry_date === yesterdayYMD)
    if (entry?.status === 'completed' || entry?.status === 'minimum') {
      maintained += 1
    }
  }

  const habitConsistencyPercent =
    scheduled.length > 0 ? Math.round((maintained / scheduled.length) * 100) : 0

  return {
    tasksCompleted,
    habitConsistencyPercent,
    milestonesReached,
    hasScheduledHabitsYesterday: scheduled.length > 0,
  }
}
