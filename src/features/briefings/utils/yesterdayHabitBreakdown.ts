/* Yesterday habit breakdown: scheduled habits partitioned for habit review step */

import { isSelectedWeekday } from '../../../lib/streaks'
import type { HabitEntry } from '../../habits/types'
import type { HabitWithStreaks } from '../../habits/types'

export interface YesterdayHabitBreakdown {
  scheduled: HabitWithStreaks[]
  completed: HabitWithStreaks[]
  missed: HabitWithStreaks[]
  skippedYesterday: HabitWithStreaks[]
}

/** Habits scheduled on a given calendar day (respects weekly bitmask) */
export function getHabitsScheduledOnDate(
  habits: HabitWithStreaks[],
  dateYMD: string,
): HabitWithStreaks[] {
  return habits.filter((habit) => {
    const isWeekly =
      habit.frequency === 'weekly' &&
      typeof habit.frequency_target === 'number' &&
      habit.frequency_target >= 1 &&
      habit.frequency_target <= 127
    return !isWeekly || isSelectedWeekday(dateYMD, habit.frequency_target ?? 0)
  })
}

function entryForDate(
  entriesByHabit: Record<string, HabitEntry[]>,
  habitId: string,
  dateYMD: string,
): HabitEntry | undefined {
  return (entriesByHabit[habitId] ?? []).find((e) => e.entry_date === dateYMD)
}

/**
 * Partition yesterday's scheduled habits into completed (target/minimum) and missed (skip/no entry).
 * skippedYesterday lists habits with explicit skip status (used for step trigger).
 */
export function getYesterdayHabitBreakdown(
  habits: HabitWithStreaks[],
  entriesByHabit: Record<string, HabitEntry[]>,
  yesterdayYMD: string,
): YesterdayHabitBreakdown {
  const scheduled = getHabitsScheduledOnDate(habits, yesterdayYMD)
  const completed: HabitWithStreaks[] = []
  const missed: HabitWithStreaks[] = []
  const skippedYesterday: HabitWithStreaks[] = []

  for (const habit of scheduled) {
    const entry = entryForDate(entriesByHabit, habit.id, yesterdayYMD)
    if (entry?.status === 'completed' || entry?.status === 'minimum') {
      completed.push(habit)
    } else {
      missed.push(habit)
    }
    if (entry?.status === 'skipped') {
      skippedYesterday.push(habit)
    }
  }

  return { scheduled, completed, missed, skippedYesterday }
}
