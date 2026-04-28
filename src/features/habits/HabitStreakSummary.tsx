/* HabitStreakSummary: Streak block — fire + streak length, target-day count, minimum-day count */

import type { HabitWithStreaks } from './types'
import { formatHabitStreakCount, isWeeklyStreakHabit } from './formatHabitStreak'

export interface HabitStreakSummaryProps {
  habit: HabitWithStreaks
  /** Show longest streak (same unit as line 1: days or weeks) */
  showLongest?: boolean
  /** When false, only the 🔥 streak line (e.g. Tasks list habit rows) */
  showTargetMinBreakdown?: boolean
  /** Table column uses smaller type; default for cards and lists */
  variant?: 'default' | 'compact'
}

/** Unit label for target/min lines (days, weeks, or months) */
function unitLabel(habit: Pick<HabitWithStreaks, 'frequency' | 'frequency_target'>, n: number): string {
  if (isWeeklyStreakHabit(habit)) return `${n} ${n === 1 ? 'week' : 'weeks'}`
  if (habit.frequency === 'monthly') return `${n} ${n === 1 ? 'month' : 'months'}`
  return `${n} ${n === 1 ? 'day' : 'days'}`
}

/**
 * Renders the standard streak counter: primary length, then target/min day counts within the streak.
 */
export function HabitStreakSummary({
  habit,
  showLongest = false,
  showTargetMinBreakdown = true,
  variant = 'default',
}: HabitStreakSummaryProps) {
  /* Primary labels: reuse shared formatter so “days vs weeks” stays consistent across the app. */
  const streakPrimary = formatHabitStreakCount(habit, habit.currentStreak)
  const longestPrimary = formatHabitStreakCount(habit, habit.longestStreak)

  const primaryClass =
    variant === 'compact'
      ? 'text-xs font-bold text-bonsai-brown-700'
      : 'text-body font-bold text-bonsai-brown-700'
  const subClass =
    variant === 'compact'
      ? 'text-[10px] text-bonsai-slate-600 leading-tight'
      : 'text-secondary text-bonsai-slate-600'
  const maxClass =
    variant === 'compact' ? 'text-[10px] text-bonsai-slate-500 leading-tight' : 'text-secondary text-bonsai-slate-500'

  const ariaLabel = showTargetMinBreakdown
    ? `Streak ${streakPrimary}. Target ${unitLabel(habit, habit.currentStreakTargetCount)}, Min ${unitLabel(habit, habit.currentStreakMinimumCount)}`
    : `Streak ${streakPrimary}`

  return (
    <div className="flex flex-col gap-0 items-start text-left" role="group" aria-label={ariaLabel}>
      <span className={primaryClass}>🔥{streakPrimary}</span>
      {showTargetMinBreakdown ? (
        <>
          <span className={subClass}>
            Target: {unitLabel(habit, habit.currentStreakTargetCount)}
          </span>
          <span className={subClass}>
            Min: {unitLabel(habit, habit.currentStreakMinimumCount)}
          </span>
        </>
      ) : null}
      {showLongest ? <span className={maxClass}>Best: {longestPrimary}</span> : null}
    </div>
  )
}
