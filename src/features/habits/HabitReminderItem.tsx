/* HabitReminderItem: Streak, target action label, due time, Target (+ optional Minimum) */

import { Button } from '../../components/Button'
import { BellIcon } from '../../components/icons'
import { TruncatedText } from '../../components/TruncatedText'
import { getDueStatus, formatStartDueDisplay, habitReminderEffectiveInstant } from '../tasks/utils/date'
import { useUserTimeZone } from '../settings/useUserTimeZone'
import type { Task } from '../tasks/types'
import { HabitStreakSummary } from './HabitStreakSummary'
import type { HabitWithStreaks } from './types'

/** Format reminder date for display */
function formatNotificationDate(remindAt: string | null, timeZone: string): string {
  if (!remindAt) return 'No time set'
  const display = formatStartDueDisplay(undefined, remindAt, timeZone)
  return display ?? 'No time set'
}

/** Primary label: target action text, else habit name */
function targetLabel(habit: HabitWithStreaks): string {
  const t = habit.desired_action?.trim()
  return t && t.length > 0 ? t : habit.name
}

export interface HabitReminderItemProps {
  habit: HabitWithStreaks
  /** Linked recurring task (drives due in Tasks) */
  task: Task
  remindAt: string | null
  reminderTime?: string | null
  onTargetComplete: () => void
  onMinimum: () => void
  onSkip: () => void
  /** Disable action buttons while an update is in flight (prevents double submit and provides feedback). */
  actionsDisabled?: boolean
  density?: 'default' | 'compact'
  /** Tasks list: streak only; elsewhere defaults to full target/min breakdown */
  showStreakBreakdown?: boolean
}

/**
 * Habit-linked task row: streak | target action | due time | Target (+ optional Minimum).
 */
export function HabitReminderItem({
  habit,
  task,
  remindAt,
  reminderTime,
  onTargetComplete,
  onMinimum,
  onSkip,
  actionsDisabled = false,
  density = 'default',
  showStreakBreakdown = true,
}: HabitReminderItemProps) {
  const timeZone = useUserTimeZone()
  const wallTime = reminderTime ?? habit.reminder_time
  const dueSource = task.due_date ?? remindAt
  const effectiveRemindAt = habitReminderEffectiveInstant(dueSource, wallTime, timeZone)

  const dueStatus = effectiveRemindAt != null ? getDueStatus(effectiveRemindAt, timeZone) : null
  const isRemindOverdue = dueStatus === 'overdue'
  const isRemindDueSoon = dueStatus === 'dueSoon'

  /* Habit capability: minimum status only makes sense when a minimum action is defined */
  const hasMinimumAction = Boolean(habit.minimum_action && habit.minimum_action.trim() !== '')

  /* Typography: match TaskListItem name sizing (compact rows use text-sm). */
  const nameClass =
    density === 'compact'
      ? 'text-sm font-medium text-bonsai-slate-800'
      : 'text-body font-medium text-bonsai-slate-800'

  /* Layout: mobile stacks 3 rows; larger viewports use a 2-row grid (top: name+due, bottom: actions). */
  const containerClasses =
    density === 'compact'
      ? 'flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center gap-2 rounded-lg border border-dashed border-bonsai-slate-200 bg-white px-3 py-2 hover:bg-bonsai-slate-50 transition-colors text-left min-w-0'
      : 'flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center gap-2 rounded-lg border border-bonsai-slate-200 bg-white p-2.5 sm:gap-3 sm:p-4 hover:bg-bonsai-slate-50 transition-colors text-left min-w-0'

  return (
    <div
      className={containerClasses}
      role="article"
      aria-label={`Habit: ${targetLabel(habit)}, streak ${habit.currentStreak}`}
    >
      {/* Row 1 (mobile): streak + reminder name (matches Task rows) */}
      <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
        <div className="shrink-0">
          <HabitStreakSummary
            habit={habit}
            showLongest={false}
            showTargetMinBreakdown={showStreakBreakdown}
            variant="default"
          />
        </div>

        <div className="min-w-0 flex-1">
          {/* Name truncation: force ellipsis by constraining width and using nowrap overflow rules. */}
          <TruncatedText className={`block w-full truncate ${nameClass} text-left`} style={{ maxWidth: '100%' }}>
            {targetLabel(habit)}
          </TruncatedText>
        </div>
      </div>

      {/* Row 2 (mobile): due date + time */}
      <div
        className={`flex w-full items-center gap-1.5 text-secondary sm:w-auto sm:justify-end ${
          isRemindOverdue
            ? 'text-red-600 font-medium'
            : isRemindDueSoon
              ? 'text-amber-600 font-medium'
              : 'text-bonsai-slate-500'
        }`}
      >
        <BellIcon className="w-4 h-4 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">{formatNotificationDate(effectiveRemindAt, timeZone)}</span>
      </div>

      {/* Row 3 (mobile): action buttons */}
      <div className="flex flex-wrap items-center gap-2 w-full justify-start sm:col-span-2 sm:justify-end">
        {/* Target: mark the habit as completed for this occurrence */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={actionsDisabled}
          onClick={(e) => {
            e.stopPropagation()
            onTargetComplete()
          }}
          className="border-2 border-bonsai-sage-600 text-bonsai-sage-700 bg-white hover:bg-bonsai-sage-50 focus:ring-bonsai-sage-500"
        >
          Target
        </Button>
        {/* Minimum: optional per-habit; only render when configured */}
        {hasMinimumAction && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={actionsDisabled}
            onClick={(e) => {
              e.stopPropagation()
              onMinimum()
            }}
            className="border-2 border-amber-500 text-amber-800 bg-white hover:bg-amber-50 focus:ring-amber-500"
          >
            Minimum
          </Button>
        )}
        {/* Skip: mark the habit as skipped for this occurrence (always available so reminders can be dismissed intentionally). */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={actionsDisabled}
          onClick={(e) => {
            e.stopPropagation()
            onSkip()
          }}
          className="border-2 border-red-500 text-red-700 bg-white hover:bg-red-50 focus:ring-red-500"
        >
          Skip
        </Button>
      </div>
    </div>
  )
}
