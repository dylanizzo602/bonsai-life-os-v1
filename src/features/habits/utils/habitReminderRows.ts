/* habitReminderRows: Build and filter habit-linked task reminders for Tasks and notifications */

import type { HabitEntry, HabitWithStreaks } from '../types'
import { isHabitEligibleForTodoReminder } from '../habitReminderEligibility'
import type { Task } from '../../tasks/types'
import { habitReminderEffectiveInstant } from '../../tasks/utils/date'

export type HabitReminderRow = {
  habit: HabitWithStreaks
  task: Task
  remindAt: string | null
}

/** Join habit-linked tasks with streak data (excludes archived/deleted tasks). */
export function buildHabitReminderRows(
  tasks: Task[],
  habitsWithStreaks: HabitWithStreaks[],
): HabitReminderRow[] {
  return tasks
    .filter(
      (t) =>
        t.habit_id != null &&
        t.status !== 'deleted' &&
        t.status !== 'archived',
    )
    .map((task) => {
      const habit = habitsWithStreaks.find((h) => h.id === task.habit_id)
      if (!habit || !isHabitEligibleForTodoReminder(habit)) return null
      return { habit, task, remindAt: task.due_date }
    })
    .filter((row): row is HabitReminderRow => row != null)
}

/**
 * Actionable reminders: due now or earlier, not completed/skipped today, not dismissed.
 */
export function filterActionableHabitReminders(
  rows: HabitReminderRow[],
  timeZone: string,
  todayYMD: string,
  entriesByHabit: Record<string, HabitEntry[]>,
  dismissedHabitIds: Set<string>,
): HabitReminderRow[] {
  const nowMs = Date.now()

  return rows.filter(({ habit, task, remindAt }) => {
    if (dismissedHabitIds.has(habit.id)) return false

    const todayEntry = (entriesByHabit[habit.id] ?? []).find(
      (e) => e.entry_date === todayYMD,
    )
    if (todayEntry?.status === 'completed' || todayEntry?.status === 'skipped') {
      return false
    }

    const due = task.due_date ?? remindAt
    if (due == null) return true

    const effectiveIso = habitReminderEffectiveInstant(
      due,
      habit.reminder_time ?? null,
      timeZone,
    )
    const ms =
      effectiveIso != null ? new Date(effectiveIso).getTime() : new Date(due).getTime()
    return ms <= nowMs
  })
}

/** Primary label for a habit reminder (target action or habit name). */
export function habitReminderTargetLabel(habit: HabitWithStreaks): string {
  const t = habit.desired_action?.trim()
  return t && t.length > 0 ? t : habit.name
}
