/* HabitGrid: Card-based habits layout for a single selected date (set entry status, show streak + breakdown) */

import { useMemo } from 'react'
import { isSelectedWeekday } from '../../lib/streaks'
import { MoreVerticalIcon } from '../../components/icons'
import type { HabitEntry, HabitWithStreaks } from './types'

export interface HabitGridProps {
  /* Data: habits already decorated with streak numbers */
  habits: HabitWithStreaks[]
  /* Data: entries for the selected date (HabitsPage sets dateRange to a single day) */
  entriesByHabit: Record<string, HabitEntry[]>
  /* Date: which day the user is editing */
  selectedDateYMD: string
  /* Actions: set status for a habit on the selected date (null clears to "open") */
  onSetEntry: (
    habitId: string,
    entryDate: string,
    status: 'completed' | 'minimum' | 'skipped' | null,
  ) => Promise<void>
  /* Actions: open edit/settings for a habit */
  onEditHabit: (habit: HabitWithStreaks) => void
}

/** Resolve the selected day's status for a habit (no row = open) */
function getStatusForDate(
  entriesByHabit: Record<string, HabitEntry[]>,
  habitId: string,
  ymd: string,
): 'completed' | 'minimum' | 'skipped' | null {
  const entries = entriesByHabit[habitId] ?? []
  const e = entries.find((x) => x.entry_date === ymd)
  return e ? e.status : null
}

/** Visual label + color for the selected day's status */
function getStatusPill(status: 'completed' | 'minimum' | 'skipped' | null): {
  label: string
  className: string
} {
  if (status === 'completed') {
    return { label: 'Target', className: 'bg-green-100 text-green-800 border-green-200' }
  }
  if (status === 'minimum') {
    return { label: 'Minimum', className: 'bg-amber-100 text-amber-800 border-amber-200' }
  }
  if (status === 'skipped') {
    return { label: 'Skipped', className: 'bg-red-100 text-red-800 border-red-200' }
  }
  return { label: 'Open', className: 'bg-bonsai-slate-100 text-bonsai-slate-700 border-bonsai-slate-200' }
}

/** Format "HH:mm:ss" (or "HH:mm") to "h:mm AM/PM" for due-by display */
function formatReminderTime(hhmmss: string): string {
  const parts = hhmmss.split(':')
  const h = parseInt(parts[0] ?? '', 10)
  const m = parseInt(parts[1] ?? '0', 10)
  if (!Number.isFinite(h) || h < 0 || h > 23 || !Number.isFinite(m) || m < 0 || m > 59) {
    return hhmmss
  }
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

/** True when habit is scheduled on the given date (weekly habits use weekday bitmask; others always scheduled). */
function isHabitScheduledOnDate(habit: HabitWithStreaks, ymd: string): boolean {
  const isWeekly =
    habit.frequency === 'weekly' &&
    typeof habit.frequency_target === 'number' &&
    habit.frequency_target >= 1 &&
    habit.frequency_target <= 127
  return !isWeekly || isSelectedWeekday(ymd, habit.frequency_target ?? 0)
}

/**
 * Habits grid: responsive cards with streak count and streak breakdown.
 * Buttons set the selected day's entry; 3-dot icon opens settings.
 */
export function HabitGrid({
  habits,
  entriesByHabit,
  selectedDateYMD,
  onSetEntry,
  onEditHabit,
}: HabitGridProps) {
  /* Sort: scheduled for selected day first (A→Z), then not scheduled (A→Z) */
  const { scheduledHabits, unscheduledHabits } = useMemo(() => {
    const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
    const sorted = [...habits].sort((a, b) => {
      const aScheduled = isHabitScheduledOnDate(a, selectedDateYMD)
      const bScheduled = isHabitScheduledOnDate(b, selectedDateYMD)
      if (aScheduled !== bScheduled) return aScheduled ? -1 : 1
      return collator.compare(a.name, b.name)
    })
    const scheduledHabits = sorted.filter((h) => isHabitScheduledOnDate(h, selectedDateYMD))
    const unscheduledHabits = sorted.filter((h) => !isHabitScheduledOnDate(h, selectedDateYMD))
    return { scheduledHabits, unscheduledHabits }
  }, [habits, selectedDateYMD])

  /* Render: responsive grid (mobile 1 col, tablet 2 cols, desktop 3 cols) */
  const gridClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'

  /* Render: shared card for a habit */
  const renderHabitCard = (habit: HabitWithStreaks) => {
        /* Weekly logic: only allow entry on selected weekdays when habit uses weekly bitmask */
        const isSelectedDay = isHabitScheduledOnDate(habit, selectedDateYMD)

        /* Selected-day status: drives pill text/color and the cycle action */
        const status = isSelectedDay ? getStatusForDate(entriesByHabit, habit.id, selectedDateYMD) : null
        const pill = getStatusPill(isSelectedDay ? status : null)

        /* Due-by display: reminder_time is stored as a local wall-clock time (HH:mm:ss) */
        const dueByText = habit.reminder_time
          ? `Due by ${formatReminderTime(habit.reminder_time)}`
          : 'Any time'

        return (
          <div
            key={habit.id}
            className={`rounded-2xl border bg-white p-4 md:p-5 shadow-sm transition-colors ${
              isSelectedDay
                ? 'border-bonsai-slate-200 hover:bg-bonsai-slate-50/50 hover:shadow-md'
                : 'border-bonsai-slate-200 opacity-60'
            }`}
          >
            {/* Card header: habit name + overflow (settings) button */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-body font-semibold text-bonsai-brown-700 truncate" title={habit.name}>
                  {habit.name}
                </h2>
                <p className="text-secondary text-bonsai-slate-600 mt-0.5">
                  {dueByText}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEditHabit(habit)}
                className="shrink-0 rounded-lg p-2 text-bonsai-slate-500 hover:bg-bonsai-slate-100 hover:text-bonsai-slate-700 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500"
                aria-label="Open habit settings"
                title="Settings"
              >
                <MoreVerticalIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Streak summary: big current streak + target/min breakdown underneath */}
            <div className="mt-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-secondary text-bonsai-slate-600">Streak</div>
                  <div className="text-[32px] md:text-[36px] leading-none font-bold text-bonsai-brown-700">
                    {habit.currentStreak}
                  </div>
                </div>
                <div className={`text-secondary border rounded-full px-2.5 py-1 ${pill.className}`}>
                  {pill.label}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-bonsai-slate-200 bg-bonsai-slate-50 px-3 py-2">
                  <div className="text-secondary text-bonsai-slate-600">Target count</div>
                  <div className="text-body font-semibold text-bonsai-slate-800">
                    {habit.currentStreakTargetCount}
                  </div>
                </div>
                <div className="rounded-xl border border-bonsai-slate-200 bg-bonsai-slate-50 px-3 py-2">
                  <div className="text-secondary text-bonsai-slate-600">Minimum count</div>
                  <div className="text-body font-semibold text-bonsai-slate-800">
                    {habit.currentStreakMinimumCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Entry actions: set a specific status for the selected date */}
            <div className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isSelectedDay}
                  onClick={() => onSetEntry(habit.id, selectedDateYMD, null)}
                  className={`rounded-lg px-3 py-2 text-body font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:ring-offset-2 ${
                    !isSelectedDay
                      ? 'bg-bonsai-slate-100 text-bonsai-slate-400 cursor-not-allowed'
                      : status === null
                        ? 'bg-bonsai-slate-900 text-white'
                        : 'bg-white border border-bonsai-slate-200 text-bonsai-slate-800 hover:bg-bonsai-slate-50'
                  }`}
                >
                  Open
                </button>
                <button
                  type="button"
                  disabled={!isSelectedDay}
                  onClick={() => onSetEntry(habit.id, selectedDateYMD, 'completed')}
                  className={`rounded-lg px-3 py-2 text-body font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:ring-offset-2 ${
                    !isSelectedDay
                      ? 'bg-bonsai-slate-100 text-bonsai-slate-400 cursor-not-allowed'
                      : status === 'completed'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-50 border border-green-200 text-green-800 hover:bg-green-100'
                  }`}
                >
                  Target
                </button>
                <button
                  type="button"
                  disabled={!isSelectedDay}
                  onClick={() => onSetEntry(habit.id, selectedDateYMD, 'minimum')}
                  className={`rounded-lg px-3 py-2 text-body font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:ring-offset-2 ${
                    !isSelectedDay
                      ? 'bg-bonsai-slate-100 text-bonsai-slate-400 cursor-not-allowed'
                      : status === 'minimum'
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Minimum
                </button>
                <button
                  type="button"
                  disabled={!isSelectedDay}
                  onClick={() => onSetEntry(habit.id, selectedDateYMD, 'skipped')}
                  className={`rounded-lg px-3 py-2 text-body font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500 focus:ring-offset-2 ${
                    !isSelectedDay
                      ? 'bg-bonsai-slate-100 text-bonsai-slate-400 cursor-not-allowed'
                      : status === 'skipped'
                        ? 'bg-red-500 text-white'
                        : 'bg-red-50 border border-red-200 text-red-800 hover:bg-red-100'
                  }`}
                >
                  Skipped
                </button>
              </div>
              {!isSelectedDay && (
                <p className="mt-2 text-secondary text-bonsai-slate-500">
                  Not scheduled for this day.
                </p>
              )}
            </div>
          </div>
        )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Scheduled section: habits that can be logged on selectedDateYMD */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-body font-semibold text-bonsai-slate-800">
            Scheduled
          </h2>
          <span className="text-secondary text-bonsai-slate-500">
            {scheduledHabits.length}
          </span>
        </div>
        {scheduledHabits.length > 0 ? (
          <div className={gridClass}>
            {scheduledHabits.map(renderHabitCard)}
          </div>
        ) : (
          <div className="rounded-xl border border-bonsai-slate-200 bg-bonsai-slate-50 p-4">
            <p className="text-body text-bonsai-slate-700">
              No habits are scheduled for this date.
            </p>
            <p className="mt-1 text-secondary text-bonsai-slate-600">
              Try a different date or adjust weekly schedules in a habit’s settings.
            </p>
          </div>
        )}
      </section>

      {/* Not scheduled section: habits pushed to the bottom */}
      {unscheduledHabits.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-body font-semibold text-bonsai-slate-800">
              Not scheduled
            </h2>
            <span className="text-secondary text-bonsai-slate-500">
              {unscheduledHabits.length}
            </span>
          </div>
          <div className={gridClass}>
            {unscheduledHabits.map(renderHabitCard)}
          </div>
        </section>
      )}
    </div>
  )
}

