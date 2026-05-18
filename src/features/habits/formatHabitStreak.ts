/* Habit streak formatting helpers: shared “days vs weeks vs months” logic for all habit UIs */
import type { Habit } from './types'
import { isMonthlyIntervalHabit } from '../../lib/habitStreaks'

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

/** Re-export for habit UI that only has frequency fields */
export { isMonthlyIntervalHabit }

/** Pluralize a unit label (“1 day” vs “2 days”). */
function pluralize(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

/** Format a streak count using the habit’s streak unit (weeks, months, or days). */
export function formatHabitStreakCount(
  habit: Pick<Habit, 'frequency' | 'frequency_target'>,
  count: number,
): string {
  if (isWeeklyStreakHabit(habit)) {
    return pluralize(count, 'week', 'weeks')
  }
  if (isMonthlyIntervalHabit(habit.frequency, habit.frequency_target)) {
    return pluralize(count, 'month', 'months')
  }
  return pluralize(count, 'day', 'days')
}

/** Compact badge for dashboard habit circles (e.g. "12d", "7d", "0w", "2m"). */
export function formatHabitStreakBadge(
  habit: Pick<Habit, 'frequency' | 'frequency_target'>,
  count: number,
): string {
  if (isWeeklyStreakHabit(habit)) {
    return `${count}w`
  }
  if (isMonthlyIntervalHabit(habit.frequency, habit.frequency_target)) {
    return `${count}m`
  }
  return `${count}d`
}
