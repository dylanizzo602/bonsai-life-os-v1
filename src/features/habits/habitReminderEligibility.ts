/* Eligibility for showing a habit as a task-list reminder row (add to todos + reminder or action text) */

import { habitReminderInstantForLocalDay, DEFAULT_HABIT_TODO_CLOCK } from '../../lib/habitTodoSchedule'
import type { Habit } from './types'

/**
 * True when this habit should appear under Tasks as a HabitReminderItem:
 * add_to_todos is on, and at least one of: scheduled todo_remind_at, legacy reminder_id, reminder_time, desired_action, minimum_action.
 */
export function isHabitEligibleForTodoReminder(h: Habit): boolean {
  if (!h.add_to_todos) return false
  if (h.todo_remind_at) return true
  if (h.reminder_id) return true
  const hasTime = Boolean(h.reminder_time && h.reminder_time.trim() !== '')
  const hasDesiredOrMinimum =
    Boolean(h.desired_action && h.desired_action.trim() !== '') ||
    Boolean(h.minimum_action && h.minimum_action.trim() !== '')
  return hasTime || hasDesiredOrMinimum
}

/**
 * Resolve the ISO instant for today's occurrence: prefer todo_remind_at, else wall time, else default clock when action text exists.
 */
export function resolveHabitRemindAt(habit: Habit, todayYMD: string): string | null {
  if (habit.todo_remind_at) return habit.todo_remind_at
  if (habit.reminder_time && habit.reminder_time.trim() !== '') {
    return habitReminderInstantForLocalDay(todayYMD, habit.reminder_time)
  }
  if (
    (habit.desired_action && habit.desired_action.trim() !== '') ||
    (habit.minimum_action && habit.minimum_action.trim() !== '')
  ) {
    return habitReminderInstantForLocalDay(todayYMD, DEFAULT_HABIT_TODO_CLOCK)
  }
  return null
}
