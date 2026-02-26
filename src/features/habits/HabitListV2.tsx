/* HabitListV2: Habits 1.2 view. One checkbox per habit for "Did you do it today?" (or "Done this week?" for weekly) and consecutive-days counter (strict: only completed counts). */

import { useCallback } from 'react'
import { Checkbox } from '../../components/Checkbox'
import type { HabitWithStreaksV2, HabitEntry } from './types'

/** Add n days to YYYY-MM-DD */
function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Sunday (YYYY-MM-DD) that starts the week containing the given date */
function getWeekStart(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  const day = d.getDay()
  return addDays(ymd, -day)
}

export interface HabitListV2Props {
  habits: HabitWithStreaksV2[]
  entriesByHabit: Record<string, HabitEntry[]>
  todayYMD: string
  onSetEntry: (habitId: string, date: string, status: 'completed' | 'skipped' | null) => Promise<void>
  onEditHabit: (habit: HabitWithStreaksV2) => void
}

/**
 * 1.2 list: Checkbox for today (or "Done this week?" for weekly); streak = consecutive days/weeks completed only.
 */
export function HabitListV2({
  habits,
  entriesByHabit,
  todayYMD,
  onSetEntry,
  onEditHabit,
}: HabitListV2Props) {
  const getTodayStatus = useCallback(
    (habitId: string): 'completed' | 'skipped' | 'minimum' | null => {
      const entries = entriesByHabit[habitId] ?? []
      const e = entries.find((x) => x.entry_date === todayYMD)
      return e ? e.status : null
    },
    [entriesByHabit, todayYMD]
  )

  /** For weekly: is every selected day in the current week completed? */
  const isWeekCompleted = useCallback(
    (habit: HabitWithStreaksV2): boolean => {
      const mask = habit.frequency_target ?? 0
      if (habit.frequency !== 'weekly' || mask < 1 || mask > 127) return false
      const weekStart = getWeekStart(todayYMD)
      const entries = entriesByHabit[habit.id] ?? []
      const byDate = new Map(entries.map((e) => [e.entry_date, e.status]))
      for (let i = 0; i < 7; i++) {
        if ((mask & (1 << i)) === 0) continue
        const date = addDays(weekStart, i)
        if (byDate.get(date) !== 'completed') return false
      }
      return true
    },
    [entriesByHabit, todayYMD]
  )

  const handleCheckChange = useCallback(
    async (habit: HabitWithStreaksV2, checked: boolean) => {
      const status = checked ? 'completed' : 'skipped'
      const isWeekly =
        habit.frequency === 'weekly' &&
        typeof habit.frequency_target === 'number' &&
        habit.frequency_target >= 1 &&
        habit.frequency_target <= 127

      if (isWeekly) {
        const weekStart = getWeekStart(todayYMD)
        const mask = habit.frequency_target!
        for (let i = 0; i < 7; i++) {
          if ((mask & (1 << i)) === 0) continue
          const date = addDays(weekStart, i)
          await onSetEntry(habit.id, date, status)
        }
      } else {
        await onSetEntry(habit.id, todayYMD, status)
      }
    },
    [onSetEntry, todayYMD]
  )

  if (habits.length === 0) {
    return null
  }

  return (
    <div className="w-full max-w-xl">
      <ul className="divide-y divide-bonsai-slate-200 border border-bonsai-slate-200 rounded-lg bg-white overflow-hidden">
        {habits.map((habit) => {
          const isWeekly =
            habit.frequency === 'weekly' &&
            typeof habit.frequency_target === 'number' &&
            habit.frequency_target >= 1 &&
            habit.frequency_target <= 127
          const isCompleted = isWeekly ? isWeekCompleted(habit) : getTodayStatus(habit.id) === 'completed'

          return (
            <li
              key={habit.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-bonsai-slate-50/50 transition-colors"
            >
              <Checkbox
                checked={isCompleted}
                onChange={(e) => handleCheckChange(habit, e.target.checked)}
                aria-label={isWeekly ? `Done this week: ${habit.name}` : `Did you do it today: ${habit.name}`}
              />
              <button
                type="button"
                onClick={() => onEditHabit(habit)}
                className="text-body font-semibold text-bonsai-brown-700 hover:text-bonsai-brown-800 text-left flex-1 truncate"
              >
                {habit.name}
              </button>
              <span className="text-secondary text-bonsai-slate-600 whitespace-nowrap shrink-0" role="img" aria-label="streak">
                {habit.currentStreak} {isWeekly ? 'wk' : 'days'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
