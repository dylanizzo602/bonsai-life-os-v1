/* habitReminderRows: Build and filter habit-linked task reminders for Tasks and notifications */

import {
  habitReminderLookbackStartYMD,
  isHabitOccurrenceResolved,
  listHabitOccurrenceDatesInRange,
  remindAtForHabitOccurrenceDate,
} from '../../../lib/habitReminderOccurrences'
import type { HabitEntry, HabitWithStreaks } from '../types'
import { isHabitEligibleForTodoReminder } from '../habitReminderEligibility'
import type { Task } from '../../tasks/types'
import { habitReminderEffectiveInstant } from '../../tasks/utils/date'

export type HabitReminderRow = {
  habit: HabitWithStreaks
  task: Task
  remindAt: string | null
}

/** One actionable notification row for a specific habit occurrence date */
export type HabitNotificationRow = HabitReminderRow & {
  occurrenceDate: string
  rowKey: string
}

/** Stable key for one habit occurrence (habit id + local calendar date). */
export function habitNotificationDismissKey(habitId: string, occurrenceDate: string): string {
  return `${habitId}:${occurrenceDate}`
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
 * Build actionable in-app notification rows from computed missed occurrences.
 * Prefer DB-backed rows via useInAppNotifications when habit_reminder_notifications exist.
 */
export function buildHabitNotificationRows(
  tasks: Task[],
  habitsWithStreaks: HabitWithStreaks[],
  timeZone: string,
  todayYMD: string,
  entriesByHabit: Record<string, HabitEntry[]>,
  dismissedRowKeys: Set<string>,
): HabitNotificationRow[] {
  const baseRows = buildHabitReminderRows(tasks, habitsWithStreaks)
  const nowMs = Date.now()
  const rows: HabitNotificationRow[] = []

  for (const base of baseRows) {
    const { habit, task } = base
    const lookbackStart = habitReminderLookbackStartYMD(habit, todayYMD)
    const occurrenceDates = listHabitOccurrenceDatesInRange(habit, task, lookbackStart, todayYMD)
    const entries = entriesByHabit[habit.id] ?? []

    for (const occurrenceDate of occurrenceDates) {
      const rowKey = habitNotificationDismissKey(habit.id, occurrenceDate)
      if (dismissedRowKeys.has(rowKey)) continue
      if (isHabitOccurrenceResolved(entries, occurrenceDate)) continue

      const remindAt = remindAtForHabitOccurrenceDate(habit, task, occurrenceDate, timeZone)
      if (remindAt != null) {
        const dueMs = new Date(remindAt).getTime()
        if (Number.isFinite(dueMs) && dueMs > nowMs) continue
      }

      rows.push({
        habit,
        task,
        remindAt,
        occurrenceDate,
        rowKey,
      })
    }
  }

  return rows.sort((a, b) => {
    const aMs = a.remindAt ? new Date(a.remindAt).getTime() : 0
    const bMs = b.remindAt ? new Date(b.remindAt).getTime() : 0
    return aMs - bMs
  })
}

/**
 * Actionable reminders: due now or earlier, not completed/skipped today, not dismissed.
 * @deprecated Prefer buildHabitNotificationRows for the notification menu (per-occurrence rows).
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
