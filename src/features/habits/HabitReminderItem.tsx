/* HabitReminderItem: Row with streak counter, habit name, Complete/Skip buttons, and notification date */

import { Button } from '../../components/Button'
import { BellIcon } from '../../components/icons'
import type { HabitWithStreaks } from './types'

/** Format remind_at ISO string for display: "Today at 9:00pm" or "Feb 18 at 9:00pm" */
function formatNotificationDate(iso: string | null): string {
  if (!iso) return 'No time set'
  const d = new Date(iso)
  const today = new Date()
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  const hour12 = d.getHours() % 12 || 12
  const min = d.getMinutes()
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  const timeStr = `${hour12}:${String(min).padStart(2, '0')}${ampm}`
  if (isToday) return `Today at ${timeStr}`
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${dateStr} at ${timeStr}`
}

export interface HabitReminderItemProps {
  /** Habit with name and streak info */
  habit: HabitWithStreaks
  /** Notification datetime (ISO string from linked reminder or derived from reminder_time); used for display */
  remindAt: string | null
  /** Mark habit as complete for today */
  onMarkComplete: () => void
  /** Mark habit as skipped for today (no-op for weekly habits if you hide Skip in parent) */
  onSkip: () => void
  /** Optional: hide Skip button (e.g. for weekly habits where skip is not allowed) */
  hideSkip?: boolean
}

/**
 * Single habit reminder row: streak counter (flame + number), habit name, Complete and Skip buttons, notification date.
 * Similar to ReminderItem but tailored for habits (no checkbox; streak + actions + time).
 */
export function HabitReminderItem({
  habit,
  remindAt,
  onMarkComplete,
  onSkip,
  hideSkip = false,
}: HabitReminderItemProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-bonsai-slate-200 bg-white p-3 md:p-4 hover:bg-bonsai-slate-50 transition-colors text-left"
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

      {/* Habit name: flex-1, truncate if long */}
      <div className="flex-1 min-w-0">
        <span className="text-body text-bonsai-brown-700 truncate block">
          {habit.name}
        </span>
      </div>

      {/* Actions: Complete and Skip buttons */}
      <div className="flex shrink-0 items-center gap-2">
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

      {/* Notification date: bell icon + formatted time */}
      <div className="flex shrink-0 items-center gap-1.5 text-secondary text-bonsai-slate-500">
        <BellIcon className="w-4 h-4 md:w-5 md:h-5" aria-hidden />
        <span className="text-secondary whitespace-nowrap">
          {formatNotificationDate(remindAt)}
        </span>
      </div>
    </div>
  )
}
