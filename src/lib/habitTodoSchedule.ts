/* Habit todo reminder scheduling: local instants and advancing next due without the reminders table */

import { isoInstantToLocalCalendarYMD } from './localCalendarDate'
import { parseRecurrencePattern, getNextOccurrence, serializeRecurrencePattern } from './recurrence'
import type { RecurrencePattern } from './recurrence'

/** Matches habits.frequency / HabitFrequency in the app (kept in lib to avoid importing the feature layer). */
type HabitFrequencyCode = 'daily' | 'weekly' | 'times_per_day' | 'every_x_days'

/** Day codes for recurrence byDay (Sunday = 0 … Saturday = 6); habit frequency_target bitmask uses same order */
const RECURRENCE_DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

/** Default wall-clock when habit has action text but no reminder_time (matches habitReminderEligibility) */
export const DEFAULT_HABIT_TODO_CLOCK = '09:00:00'

/** Build recurrence pattern JSON from habit frequency for next-occurrence math (same as legacy habit-linked reminders). */
export function recurrencePatternJsonForHabit(
  frequency: HabitFrequencyCode,
  frequencyTarget: number | null,
): string | null {
  const pattern: RecurrencePattern = { freq: 'day', interval: 1 }
  if (frequency === 'daily' || frequency === 'times_per_day') {
    pattern.freq = 'day'
    pattern.interval = 1
  } else if (frequency === 'weekly') {
    pattern.freq = 'week'
    pattern.interval = 1
    if (frequencyTarget != null && frequencyTarget >= 1 && frequencyTarget <= 127) {
      pattern.byDay = [0, 1, 2, 3, 4, 5, 6]
        .filter((i) => (frequencyTarget & (1 << i)) !== 0)
        .map((i) => RECURRENCE_DAY_CODES[i])
      if (pattern.byDay.length === 0) pattern.byDay = ['MO']
    }
  } else if (frequency === 'every_x_days' && frequencyTarget != null && frequencyTarget > 0) {
    pattern.freq = 'day'
    pattern.interval = frequencyTarget
  }
  return serializeRecurrencePattern(pattern)
}

/** Format local calendar YYYY-MM-DD */
function formatLocalYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * TIMESTAMPTZ for a habit reminder on a local calendar day at reminderTime (HH:mm or HH:mm:ss).
 */
export function habitReminderInstantForLocalDay(ymd: string, reminderTime: string): string {
  const timePart = reminderTime.length <= 5 ? `${reminderTime}:00` : reminderTime.slice(0, 8)
  const parts = timePart.split(':').map((x) => parseInt(x, 10))
  const hh = parts[0] ?? 0
  const mm = parts[1] ?? 0
  const ss = parts[2] ?? 0
  const [y, mo, d] = ymd.split('-').map(Number)
  const local = new Date(y ?? 0, (mo ?? 1) - 1, d ?? 1, hh, mm, ss)
  return local.toISOString()
}

/** Today's local date at reminderTime */
export function habitReminderInstantForLocalToday(reminderTime: string): string {
  const now = new Date()
  return habitReminderInstantForLocalDay(formatLocalYMD(now), reminderTime)
}

/**
 * Next occurrence at the same local time-of-day as referenceIso, on the given local calendar day.
 */
function remindAtForLocalDate(ymd: string, referenceIso: string | null): string {
  const ref = referenceIso ? new Date(referenceIso) : new Date()
  const h = ref.getHours()
  const min = ref.getMinutes()
  const s = ref.getSeconds()
  const ms = ref.getMilliseconds()
  const [y, mo, d] = ymd.split('-').map(Number)
  const local = new Date(y ?? 0, (mo ?? 1) - 1, d ?? 1, h, min, s, ms)
  return local.toISOString()
}

/** Whether this habit should get a todo_remind_at when add_to_todos is true */
export function shouldScheduleHabitTodo(h: {
  add_to_todos: boolean
  reminder_time: string | null
  desired_action: string | null
  minimum_action: string | null
}): boolean {
  if (!h.add_to_todos) return false
  const hasTime = Boolean(h.reminder_time && h.reminder_time.trim() !== '')
  const hasDesiredOrMinimum =
    Boolean(h.desired_action && h.desired_action.trim() !== '') ||
    Boolean(h.minimum_action && h.minimum_action.trim() !== '')
  return hasTime || hasDesiredOrMinimum
}

/**
 * Initial todo_remind_at for create/update when add_to_todos is on: today at wall time or default clock.
 */
export function computeInitialTodoRemindAt(
  h: {
    reminder_time: string | null
    desired_action: string | null
    minimum_action: string | null
  },
  todayYmd: string,
): string | null {
  if (h.reminder_time && h.reminder_time.trim() !== '') {
    return habitReminderInstantForLocalDay(todayYmd, h.reminder_time)
  }
  if (
    (h.desired_action && h.desired_action.trim() !== '') ||
    (h.minimum_action && h.minimum_action.trim() !== '')
  ) {
    return habitReminderInstantForLocalDay(todayYmd, DEFAULT_HABIT_TODO_CLOCK)
  }
  return null
}

/**
 * After complete/skip/minimum on entryDate: advance todo_remind_at to the next occurrence if the current due is on entryDate.
 * Returns the new ISO string to persist, or null if no change.
 */
export function advanceTodoRemindAtIfDueOn(
  habit: {
    todo_remind_at: string | null
    frequency: HabitFrequencyCode
    frequency_target: number | null
  },
  entryDate: string,
): string | null {
  const currentIso = habit.todo_remind_at
  if (!currentIso) return null

  const dueYMD = isoInstantToLocalCalendarYMD(currentIso)
  if (!dueYMD || dueYMD !== entryDate) {
    return null
  }

  const patternStr = recurrencePatternJsonForHabit(habit.frequency, habit.frequency_target)
  const pattern = patternStr ? parseRecurrencePattern(patternStr) : null
  const dueYMDForNext = dueYMD

  if (pattern) {
    const nextDueYMD = getNextOccurrence(pattern, dueYMDForNext)
    if (!nextDueYMD) {
      return null
    }
    return remindAtForLocalDate(nextDueYMD, currentIso)
  }

  /* Legacy: no pattern (should be rare) — advance one local day */
  const currentDate = new Date(dueYMDForNext + 'T12:00:00')
  const nextDate = new Date(currentDate)
  nextDate.setDate(currentDate.getDate() + 1)
  const nextDueYMD = formatLocalYMD(nextDate)
  return remindAtForLocalDate(nextDueYMD, currentIso)
}
