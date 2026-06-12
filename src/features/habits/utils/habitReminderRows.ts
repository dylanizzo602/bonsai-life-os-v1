/* habitReminderRows: Build and filter habit-linked task reminders for Tasks and notifications */

import {
  DEFAULT_HABIT_TODO_CLOCK,
  habitReminderInstantForLocalDay,
  recurrencePatternJsonForHabit,
} from '../../../lib/habitTodoSchedule'
import { isoInstantToLocalCalendarYMD } from '../../../lib/localCalendarDate'
import { getFutureOccurrences, parseRecurrencePattern } from '../../../lib/recurrence'
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

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const
/** How far back to surface missed habit reminders in the notification menu */
const NOTIFICATION_LOOKBACK_DAYS = 90

/** Stable key for one habit occurrence (habit id + local calendar date). */
export function habitNotificationDismissKey(habitId: string, occurrenceDate: string): string {
  return `${habitId}:${occurrenceDate}`
}

function addDaysYMD(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

/** Lookback start for missed occurrence notifications (habit creation or 90 days ago). */
function notificationLookbackStartYMD(habit: HabitWithStreaks, todayYMD: string): string {
  const fromLookback = addDaysYMD(todayYMD, -NOTIFICATION_LOOKBACK_DAYS)
  const createdYMD = isoInstantToLocalCalendarYMD(habit.created_at)
  if (createdYMD && createdYMD > fromLookback) return createdYMD
  return fromLookback
}

/** Resolve the ISO instant when a habit occurrence becomes due on a local calendar day. */
function remindAtForOccurrenceDate(
  habit: HabitWithStreaks,
  task: Task,
  occurrenceDate: string,
  timeZone: string,
): string | null {
  const clock =
    habit.reminder_time && habit.reminder_time.trim() !== ''
      ? habit.reminder_time
      : DEFAULT_HABIT_TODO_CLOCK

  /* Preserve time-of-day from todo_remind_at / linked task when present */
  const referenceIso = habit.todo_remind_at ?? task.due_date
  if (referenceIso) {
    const ref = new Date(referenceIso)
    if (Number.isFinite(ref.getTime())) {
      const [y, mo, d] = occurrenceDate.split('-').map(Number)
      const local = new Date(
        y ?? 0,
        (mo ?? 1) - 1,
        d ?? 1,
        ref.getHours(),
        ref.getMinutes(),
        ref.getSeconds(),
        ref.getMilliseconds(),
      )
      return habitReminderEffectiveInstant(local.toISOString(), habit.reminder_time ?? null, timeZone)
    }
  }

  const base = habitReminderInstantForLocalDay(occurrenceDate, clock)
  return habitReminderEffectiveInstant(base, habit.reminder_time ?? null, timeZone)
}

/** True when the user already logged target, minimum, or skip for this occurrence. */
function isOccurrenceResolved(entries: HabitEntry[], occurrenceDate: string): boolean {
  const entry = entries.find((e) => e.entry_date === occurrenceDate)
  return (
    entry?.status === 'completed' ||
    entry?.status === 'minimum' ||
    entry?.status === 'skipped'
  )
}

/**
 * List local calendar dates when this habit should have been done in [lookback, today].
 */
export function listHabitOccurrenceDatesInRange(
  habit: HabitWithStreaks,
  task: Task,
  lookbackStartYMD: string,
  todayYMD: string,
): string[] {
  if (lookbackStartYMD > todayYMD) return []

  const patternStr = recurrencePatternJsonForHabit(
    habit.frequency,
    habit.frequency_target,
    habit.monthly_interval ?? null,
    habit.monthly_day ?? null,
  )
  const pattern = patternStr ? parseRecurrencePattern(patternStr) : null

  /* Daily / times per day: every calendar day in range */
  if (!pattern || pattern.freq === 'day') {
    const dates: string[] = []
    let current = lookbackStartYMD
    const step = pattern?.interval && pattern.interval > 1 ? pattern.interval : 1
    while (current <= todayYMD) {
      dates.push(current)
      current = addDaysYMD(current, step)
    }
    return dates
  }

  /* Weekly: walk days and match selected weekdays */
  if (pattern.freq === 'week') {
    const rawDays = Array.isArray(pattern.byDay)
      ? pattern.byDay
      : pattern.byDay
        ? [pattern.byDay]
        : []
    const selected = new Set(rawDays)
    if (selected.size === 0) {
      return listHabitOccurrenceDatesInRange(
        { ...habit, frequency: 'daily', frequency_target: null },
        task,
        lookbackStartYMD,
        todayYMD,
      )
    }

    const dates: string[] = []
    let current = lookbackStartYMD
    while (current <= todayYMD) {
      const dow = new Date(current + 'T12:00:00').getDay()
      const code = DAY_CODES[dow]
      if (code && selected.has(code)) dates.push(current)
      current = addDaysYMD(current, 1)
    }
    return dates
  }

  /* Monthly / other: reuse recurrence helper anchored on current due */
  const anchorYMD =
    isoInstantToLocalCalendarYMD(habit.todo_remind_at ?? task.due_date) ?? todayYMD
  const fromDate = new Date(lookbackStartYMD + 'T12:00:00')
  const untilDate = new Date(todayYMD + 'T12:00:00')
  return getFutureOccurrences(pattern, anchorYMD, fromDate, untilDate).filter(
    (d) => d >= lookbackStartYMD && d <= todayYMD,
  )
}

/**
 * Build actionable in-app notification rows: one per missed habit occurrence that is due now.
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
    const lookbackStart = notificationLookbackStartYMD(habit, todayYMD)
    const occurrenceDates = listHabitOccurrenceDatesInRange(habit, task, lookbackStart, todayYMD)
    const entries = entriesByHabit[habit.id] ?? []

    for (const occurrenceDate of occurrenceDates) {
      const rowKey = habitNotificationDismissKey(habit.id, occurrenceDate)
      if (dismissedRowKeys.has(rowKey)) continue
      if (isOccurrenceResolved(entries, occurrenceDate)) continue

      const remindAt = remindAtForOccurrenceDate(habit, task, occurrenceDate, timeZone)
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
