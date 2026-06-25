/* HabitRemindersPanel: Bento panel showing upcoming and missed habit reminders */

import { useMemo, useState } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { getDailyQuote } from '../../../lib/inspirationalQuotes'
import type { HabitEntry, HabitWithStreaks } from '../types'
import type { Task } from '../../tasks/types'
import { buildHabitReminderRows } from '../utils/habitReminderRows'
import { formatReminderTimeDisplay, timeStringToMinutes } from '../utils/habitReminders'
import { isHabitScheduledOnDate } from '../utils/habitScheduling'

export interface HabitRemindersPanelProps {
  habits: HabitWithStreaks[]
  tasks: Task[]
  todayYMD: string
  entriesByHabit: Record<string, HabitEntry[]>
  /** When true, show paused message instead of reminder rows */
  vacationModeActive?: boolean
}

type ReminderRowStatus = 'upcoming' | 'missed'

interface DisplayReminderRow {
  habit: HabitWithStreaks
  label: string
  timeLabel: string
  status: ReminderRowStatus
  /** Minutes since midnight for chronological sort */
  sortMinutes: number
}

/** Resolve sortable time-of-day from habit wall clock or remindAt instant */
function getReminderSortMinutes(habit: HabitWithStreaks, remindAt: string | null): number {
  if (habit.reminder_time) {
    return timeStringToMinutes(habit.reminder_time)
  }
  if (remindAt) {
    const d = new Date(remindAt)
    if (Number.isFinite(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes()
    }
  }
  return 24 * 60
}

/** Classify a reminder row as upcoming or missed for today */
function classifyReminder(
  habit: HabitWithStreaks,
  remindAt: string | null,
  todayYMD: string,
  entriesByHabit: Record<string, HabitEntry[]>,
): ReminderRowStatus | null {
  const todayEntry = (entriesByHabit[habit.id] ?? []).find((e) => e.entry_date === todayYMD)
  if (todayEntry?.status === 'completed' || todayEntry?.status === 'skipped') return null

  if (!remindAt) return 'upcoming'

  const dueMs = new Date(remindAt).getTime()
  if (!Number.isFinite(dueMs)) return 'upcoming'
  return dueMs <= Date.now() ? 'missed' : 'upcoming'
}

/**
 * Bottom bento: habit reminder list + inspirational quote column.
 */
export function HabitRemindersPanel({
  habits,
  tasks,
  todayYMD,
  entriesByHabit,
  vacationModeActive = false,
}: HabitRemindersPanelProps) {
  const [showAll, setShowAll] = useState(false)
  const dailyQuote = getDailyQuote()

  /* Build and classify reminder rows for today */
  const { displayRows, remainingCount } = useMemo(() => {
    const baseRows = buildHabitReminderRows(tasks, habits)
    const rows: DisplayReminderRow[] = []

    for (const { habit, remindAt } of baseRows) {
      if (!isHabitScheduledOnDate(habit, todayYMD)) continue
      const status = classifyReminder(habit, remindAt, todayYMD, entriesByHabit)
      if (!status) continue

      const wallTime = habit.reminder_time
      const timeLabel = wallTime
        ? `Scheduled for ${formatReminderTimeDisplay(wallTime)}`
        : remindAt
          ? `Due ${new Date(remindAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
          : 'No time set'

      rows.push({
        habit,
        label: habit.desired_action?.trim() || habit.name,
        timeLabel: status === 'missed' ? timeLabel.replace('Scheduled for', 'Due') : timeLabel,
        status,
        sortMinutes: getReminderSortMinutes(habit, remindAt),
      })
    }

    /* Earliest to latest by reminder time */
    rows.sort((a, b) => a.sortMinutes - b.sortMinutes)

    /* Count open scheduled habits without a reminder row */
    const openHabitsToday = habits.filter((h) => {
      if (!isHabitScheduledOnDate(h, todayYMD)) return false
      const entry = (entriesByHabit[h.id] ?? []).find((e) => e.entry_date === todayYMD)
      return entry?.status !== 'completed' && entry?.status !== 'skipped'
    })

    const remaining = Math.max(0, openHabitsToday.length - rows.length)
    return { displayRows: rows, remainingCount: remaining }
  }, [habits, tasks, todayYMD, entriesByHabit])

  const visibleRows = showAll ? displayRows : displayRows.slice(0, 3)

  if (vacationModeActive) {
    return (
      <section className="mt-20">
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 md:p-8">
          <div className="flex items-center gap-3">
            <MaterialIcon name="beach_access" className="text-primary" />
            <p className="text-body text-on-surface-variant">
              Reminders paused during vacation mode.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (displayRows.length === 0 && remainingCount === 0) return null

  return (
    <section className="mt-20">
      <div className="grid h-auto grid-cols-1 gap-6 lg:grid-cols-12 lg:h-[400px]">
        {/* Reminders list */}
        <div className="flex flex-col justify-between rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 md:p-8 lg:col-span-8">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <MaterialIcon name="notifications_active" className="text-primary" />
              <h3 className="text-body font-semibold text-on-surface">Habit Reminders</h3>
            </div>
            <div className="space-y-4">
              {visibleRows.length === 0 ? (
                <p className="text-secondary text-on-surface-variant">No reminders due right now.</p>
              ) : (
                visibleRows.map((row) => (
                  <div
                    key={row.habit.id}
                    className="flex items-center justify-between rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <MaterialIcon name="notifications" className="shrink-0 text-tertiary" />
                      <div className="min-w-0">
                        <p
                          className={`truncate font-medium text-on-surface ${row.status === 'missed' ? 'opacity-60' : ''}`}
                        >
                          {row.label}
                        </p>
                        <p className="text-secondary text-on-surface-variant">{row.timeLabel}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded px-2 py-1 text-secondary font-bold ${
                        row.status === 'missed'
                          ? 'bg-error-container text-error'
                          : 'bg-primary-fixed text-primary'
                      }`}
                    >
                      {row.status === 'missed' ? 'Missed' : 'Upcoming'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-outline-variant/20 pt-6">
            <p className="text-secondary text-on-surface-variant">
              {remainingCount > 0
                ? `You have ${remainingCount} more habit${remainingCount === 1 ? '' : 's'} to complete today.`
                : 'All reminders are shown above.'}
            </p>
            {displayRows.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-secondary font-bold text-primary hover:underline"
              >
                {showAll ? 'Show Less' : 'View All Reminders'}
              </button>
            )}
          </div>
        </div>

        {/* Quote column */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-container to-primary shadow-sm lg:col-span-4">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="relative flex h-full min-h-[200px] flex-col justify-end p-6 lg:min-h-0">
            <h2 className="text-body font-bold leading-tight text-white">
              {dailyQuote.text}
            </h2>
            <p className="mt-2 text-secondary text-white/70">
              {dailyQuote.author ?? 'Bonsai helps you cultivate meaningful routines.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
