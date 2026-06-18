/* habitScheduling: Whether a habit is scheduled on a given calendar date */

import { isSelectedWeekday } from '../../../lib/streaks'
import type { HabitWithStreaks } from '../types'

/** True when habit is scheduled on the given date (weekly uses weekday bitmask). */
export function isHabitScheduledOnDate(habit: HabitWithStreaks, ymd: string): boolean {
  const isWeekly =
    habit.frequency === 'weekly' &&
    typeof habit.frequency_target === 'number' &&
    habit.frequency_target >= 1 &&
    habit.frequency_target <= 127
  return !isWeekly || isSelectedWeekday(ymd, habit.frequency_target ?? 0)
}
