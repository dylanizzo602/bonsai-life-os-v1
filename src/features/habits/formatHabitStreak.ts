/* Habit streak formatting helpers: shared “days vs weeks” logic for all habit UIs */
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

/** Pluralize a unit label (“1 day” vs “2 days”). */
function pluralize(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

/** Format a streak count using the habit’s streak unit (weeks for weekly-bitmask habits, else days). */
export function formatHabitStreakCount(
  habit: Pick<Habit, 'frequency' | 'frequency_target'>,
  count: number,
): string {
  /* Unit choice: weekly-bitmask habits measure “complete weeks”, everything else uses calendar days. */
  const isWeekly = isWeeklyStreakHabit(habit)
  return isWeekly ? pluralize(count, 'week', 'weeks') : pluralize(count, 'day', 'days')
}
