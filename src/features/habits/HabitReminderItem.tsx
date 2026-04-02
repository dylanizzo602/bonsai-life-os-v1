/* HabitReminderItem: Row with streak counter, habit name, Complete/Skip buttons, and notification date */

import { Button } from '../../components/Button'
import { BellIcon } from '../../components/icons'
import { getDueStatus, formatStartDueDisplay, habitReminderEffectiveInstant } from '../tasks/utils/date'
import { useUserTimeZone } from '../settings/useUserTimeZone'
import type { HabitWithStreaks } from './types'

/** Format reminder date for display: "Due Today", "Due Tomorrow", or "Due {date}" using shared task/reminder helpers */
function formatNotificationDate(remindAt: string | null, timeZone: string): string {
  if (!remindAt) return 'No time set'
  const display = formatStartDueDisplay(undefined, remindAt, timeZone)
  return display ?? 'No time set'
}

export interface HabitReminderItemProps {
  /** Habit with name and streak info */
  habit: HabitWithStreaks
  /** Notification datetime (ISO string from linked reminder or derived from reminder_time); used for display */
  remindAt: string | null
  /** Raw reminder time from habit settings (HH:mm or HH:mm:ss) so display clock always matches habit modal */
  reminderTime?: string | null
  /** Mark habit as complete for today */
  onMarkComplete: () => void
  /** Mark habit as skipped for today (no-op for weekly habits if you hide Skip in parent) */
  onSkip: () => void
  /** Optional: hide Skip button (e.g. for weekly habits where skip is not allowed) */
  hideSkip?: boolean
  /**
   * Optional density override:
   * - 'default' = roomier row (desktop-style)
   * - 'compact' = tighter padding and spacing for mobile/tablet and dense lists.
   */
  density?: 'default' | 'compact'
}

/**
 * Single habit reminder row: streak counter (flame + number), habit name, Complete and Skip buttons, notification date.
 * Similar to ReminderItem but tailored for habits (no checkbox; streak + actions + time).
 */
export function HabitReminderItem({
  habit,
  remindAt,
  reminderTime,
  onMarkComplete,
  onSkip,
  hideSkip = false,
  density = 'default',
}: HabitReminderItemProps) {
  const timeZone = useUserTimeZone()
  /* Effective instant: occurrence date from remind_at + clock from habit settings (fixes legacy UTC skew vs modal) */
  const wallTime = reminderTime ?? habit.reminder_time
  const effectiveRemindAt = habitReminderEffectiveInstant(remindAt, wallTime, timeZone)

  /* Due status for styling: overdue = red, due today/tomorrow = yellow/amber (same as tasks and reminders) */
  const dueStatus = effectiveRemindAt != null ? getDueStatus(effectiveRemindAt, timeZone) : null
  const isRemindOverdue = dueStatus === 'overdue'
  const isRemindDueSoon = dueStatus === 'dueSoon'

  /* Container layout: default = roomier padding (desktop), compact = tighter padding for dense mobile/tablet views */
  const containerClasses =
    density === 'compact'
      ? 'flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-bonsai-slate-200 bg-white px-3 py-2 hover:bg-bonsai-slate-50 transition-colors text-left min-w-0'
      : 'flex flex-wrap items-center gap-2 rounded-lg border border-bonsai-slate-200 bg-white p-2.5 md:gap-3 md:p-4 hover:bg-bonsai-slate-50 transition-colors text-left min-w-0'

  /* Compact layout: flex-wrap on small screens so habit name, time, and actions are not cut off; single row on larger screens */
  return (
    <div
      className={containerClasses}
      role="article"
      aria-label={`Habit reminder: ${habit.name}, streak ${habit.currentStreak}`}
    >
      {/* Streak counter: number + flame icon (replaces checkbox in reminder item) */}
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-body font-bold text-bonsai-brown-700" aria-hidden>
          {habit.currentStreak}
        </span>
        <span className="text-bonsai-brown-700" role="img" aria-label="streak">
          🔥
        </span>
      </div>

      {/* Habit name: flex-1 min-w-0 so it can shrink; match task text size/style and truncate when long */}
      <div className="flex-1 min-w-0">
        <span className="block truncate text-sm font-medium text-bonsai-slate-800">
          {habit.name}
        </span>
      </div>

      {/* Notification date: bell + "Due Today" / "Due Tomorrow" or "Due {date}" with shared due-soon/overdue colors */}
      <div
        className={`flex shrink-0 items-center gap-1.5 text-secondary text-sm md:text-base ${
          isRemindOverdue ? 'text-red-600 font-medium' : isRemindDueSoon ? 'text-amber-600 font-medium' : 'text-bonsai-slate-500'
        }`}
      >
        <BellIcon className="w-4 h-4 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">
          {formatNotificationDate(effectiveRemindAt, timeZone)}
        </span>
      </div>

      {/* Actions: Complete and Skip buttons; compact density keeps buttons tight while still full-width on small screens */}
      <div className="flex shrink-0 items-center gap-2 w-full sm:w-auto justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onMarkComplete()
          }}
          className="border-2 border-bonsai-sage-600 text-bonsai-sage-700 bg-white hover:bg-bonsai-sage-50 focus:ring-bonsai-sage-500"
        >
          Complete
        </Button>
        {!hideSkip && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onSkip()
            }}
            className="border-2 border-bonsai-sage-600 text-bonsai-sage-700 bg-white hover:bg-bonsai-sage-50 focus:ring-bonsai-sage-500"
          >
            Skip
          </Button>
        )}
      </div>
    </div>
  )
}
