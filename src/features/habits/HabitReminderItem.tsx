/* HabitReminderItem: Streak, target action label, due time, Target / Minimum / Skip */

import { Button } from '../../components/Button'
import { BellIcon } from '../../components/icons'
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
  density?: 'default' | 'compact'
  /** Tasks list: streak only; elsewhere defaults to full target/min breakdown */
  showStreakBreakdown?: boolean
}

/**
 * Habit-linked task row: streak | target action | due time | Target / Minimum / Skip.
 */
export function HabitReminderItem({
  habit,
  task,
  remindAt,
  reminderTime,
  onTargetComplete,
  onMinimum,
  onSkip,
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

  const containerClasses =
    density === 'compact'
      ? 'flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-bonsai-slate-200 bg-white px-3 py-2 hover:bg-bonsai-slate-50 transition-colors text-left min-w-0'
      : 'flex flex-wrap items-center gap-2 rounded-lg border border-bonsai-slate-200 bg-white p-2.5 md:gap-3 md:p-4 hover:bg-bonsai-slate-50 transition-colors text-left min-w-0'

  return (
    <div
      className={containerClasses}
      role="article"
      aria-label={`Habit: ${targetLabel(habit)}, streak ${habit.currentStreak}`}
    >
      <div className="flex shrink-0">
        <HabitStreakSummary
          habit={habit}
          showLongest={false}
          showTargetMinBreakdown={showStreakBreakdown}
          variant="default"
        />
      </div>

      <div className="flex-1 min-w-0">
        <span className="block truncate text-sm font-medium text-bonsai-slate-800">
          {targetLabel(habit)}
        </span>
      </div>

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

      <div className="flex shrink-0 flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onTargetComplete()
          }}
          className="border-2 border-bonsai-sage-600 text-bonsai-sage-700 bg-white hover:bg-bonsai-sage-50 focus:ring-bonsai-sage-500"
        >
          Target
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onMinimum()
          }}
          className="border-2 border-amber-500 text-amber-800 bg-white hover:bg-amber-50 focus:ring-amber-500"
        >
          Minimum
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onSkip()
          }}
          className="border-2 border-bonsai-slate-400 text-bonsai-slate-700 bg-white hover:bg-bonsai-slate-50 focus:ring-bonsai-slate-500"
        >
          Skip
        </Button>
      </div>
    </div>
  )
}
