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

/** True when habit uses monthly streak math (scheduled day-of-month occurrences). */
export function isMonthlyStreakHabit(
  habit: Pick<Habit, 'frequency'>,
): boolean {
  return habit.frequency === 'monthly'
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
  /* Unit choice: weekly-bitmask → weeks; monthly → months; otherwise days. */
  const isWeekly = isWeeklyStreakHabit(habit)
  if (isWeekly) return pluralize(count, 'week', 'weeks')
  if (habit.frequency === 'monthly') return pluralize(count, 'month', 'months')
  return pluralize(count, 'day', 'days')
}
