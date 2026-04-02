/* Eligibility for showing a habit as a task-list reminder row (add to todos + reminder or action text) */

import { habitReminderInstantForLocalDay } from '../../lib/supabase/reminders'
import type { Habit } from './types'
import type { Reminder } from '../reminders/types'

/**
 * When the habit has desired/minimum action text but no reminder_time, synthesize a default
 * wall-clock for "today" so the row can still sort/filter like other timed reminders.
 */
const DEFAULT_REMINDER_CLOCK_WHEN_NO_TIME = '09:00:00'

/**
 * True when this habit should appear under Tasks as a HabitReminderItem:
 * add_to_todos is on, and at least one of: linked reminder, reminder_time, desired_action, minimum_action.
 */
export function isHabitEligibleForTodoReminder(h: Habit): boolean {
  if (!h.add_to_todos) return false
  if (h.reminder_id) return true
  const hasTime = Boolean(h.reminder_time && h.reminder_time.trim() !== '')
  const hasDesiredOrMinimum =
    Boolean(h.desired_action && h.desired_action.trim() !== '') ||
    Boolean(h.minimum_action && h.minimum_action.trim() !== '')
  return hasTime || hasDesiredOrMinimum
}

/**
 * Resolve the ISO instant for today's occurrence: prefer linked recurring reminder, else wall time, else default clock when action text exists.
 */
export function resolveHabitRemindAt(
  habit: Habit,
  linked: Reminder | undefined | null,
  todayYMD: string,
): string | null {
  if (linked?.remind_at) return linked.remind_at
  if (habit.reminder_time && habit.reminder_time.trim() !== '') {
    return habitReminderInstantForLocalDay(todayYMD, habit.reminder_time)
  }
  if (
    (habit.desired_action && habit.desired_action.trim() !== '') ||
    (habit.minimum_action && habit.minimum_action.trim() !== '')
  ) {
    return habitReminderInstantForLocalDay(todayYMD, DEFAULT_REMINDER_CLOCK_WHEN_NO_TIME)
  }
  return null
}
