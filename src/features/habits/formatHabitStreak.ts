/* Weekly streak habit detection — matches habitStreaks.ts and HabitTable weekday cells */
import type { Habit } from './types'

/** True when habit uses weekly complete-week streak math (matches habitStreaks / HabitTable cells). */
export function isWeeklyStreakHabit(
  habit: Pick<Habit, 'frequency' | 'frequency_target'>,
): boolean {
  return (
    habit.frequency === 'weekly' &&
    typeof habit.frequency_target === 'number' &&
    habit.frequency_target >= 1 &&
    habit.frequency_target <= 127
  )
}
