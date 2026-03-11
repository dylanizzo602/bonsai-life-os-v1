/* HabitReminderItem: Row with streak counter, habit name, Complete/Skip buttons, and notification date */

import { Button } from '../../components/Button'
import { BellIcon } from '../../components/icons'
import { isOverdue } from '../tasks/utils/date'
import type { HabitWithStreaks } from './types'

/** Format notification display using remindAt date and habit.reminder_time clock so UI matches habit settings */
function formatNotificationDate(remindAt: string | null, reminderTime: string | null | undefined): string {
  if (!remindAt && !reminderTime) return 'No time set'

  // Base date: use remindAt when present so we preserve the scheduled day; fall back to today if missing
  const baseDate = remindAt ? new Date(remindAt) : new Date()
  const today = new Date()
  const isToday =
    baseDate.getFullYear() === today.getFullYear() &&
    baseDate.getMonth() === today.getMonth() &&
    baseDate.getDate() === today.getDate()

  // Clock time: prefer the HH:mm from habit.reminder_time so it always matches habit settings
  let hours = baseDate.getHours()
  let minutes = baseDate.getMinutes()
  if (reminderTime) {
    const [h, m] = reminderTime.split(':')
    const parsedH = Number(h)
    const parsedM = Number(m ?? '0')
    if (!Number.isNaN(parsedH)) hours = parsedH
    if (!Number.isNaN(parsedM)) minutes = parsedM
  }

  const hour12 = hours % 12 || 12
  const ampm = hours < 12 ? 'am' : 'pm'
  const timeStr = `${hour12}:${String(minutes).padStart(2, '0')}${ampm}`

  if (isToday) return `Today at ${timeStr}`
  const dateStr = baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${dateStr} at ${timeStr}`
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
  /* Overdue flag: true when remindAt is set and the notification time is in the past */
  const isRemindOverdue = Boolean(remindAt && isOverdue(remindAt))

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

      {/* Notification date: bell + time (show next to name so it stays visible on mobile) */}
      <div
        className={`flex shrink-0 items-center gap-1.5 text-secondary text-sm md:text-base ${
          isRemindOverdue ? 'text-red-600 font-medium' : 'text-bonsai-slate-500'
        }`}
      >
        <BellIcon className="w-4 h-4 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">
          {formatNotificationDate(remindAt, reminderTime ?? habit.reminder_time)}
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
