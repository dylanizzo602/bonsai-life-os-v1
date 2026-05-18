/* Habit todo reminder scheduling: local instants and advancing next due without the reminders table */

import { isoInstantToLocalCalendarYMD } from './localCalendarDate'
import { parseRecurrencePattern, getNextOccurrence, serializeRecurrencePattern } from './recurrence'
import type { RecurrencePattern } from './recurrence'

/** Matches habits.frequency / HabitFrequency in the app (kept in lib to avoid importing the feature layer). */
type HabitFrequencyCode = 'daily' | 'weekly' | 'monthly' | 'times_per_day' | 'every_x_days'

/** Day codes for recurrence byDay (Sunday = 0 … Saturday = 6); habit frequency_target bitmask uses same order */
const RECURRENCE_DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

/** Default wall-clock when habit has action text but no reminder_time (matches habitReminderEligibility) */
export const DEFAULT_HABIT_TODO_CLOCK = '09:00:00'

/** Build recurrence pattern JSON from habit frequency for next-occurrence math (same as legacy habit-linked reminders). */
export function recurrencePatternJsonForHabit(
  frequency: HabitFrequencyCode,
  frequencyTarget: number | null,
  monthlyInterval?: number | null,
  monthlyDay?: number | null,
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
  } else if (frequency === 'monthly') {
    /* Monthly recurrence: interval + day-of-month (1-31 or -1 for last day); clamping handled by recurrence engine */
    pattern.freq = 'month'
    pattern.interval =
      typeof monthlyInterval === 'number' && Number.isFinite(monthlyInterval)
        ? Math.max(1, Math.trunc(monthlyInterval))
        : 1
    const dayRaw =
      typeof monthlyDay === 'number' && Number.isFinite(monthlyDay) ? Math.trunc(monthlyDay) : 1
    pattern.byMonthDay = dayRaw === -1 ? -1 : Math.max(1, Math.min(31, dayRaw))
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

/** Add n days to YYYY-MM-DD (local noon date math to avoid DST edges) */
function addDaysYMD(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return formatLocalYMD(d)
}

/** Clamp day-of-month to the valid range for that month; -1 means last day */
function clampDayForMonth(year: number, month: number, day: number): number {
  const last = new Date(year, month + 1, 0).getDate()
  if (day === -1 || day > last) return last
  return Math.max(1, Math.min(31, day))
}

/**
 * Next occurrence date on or after todayYMD.
 * Note: habits currently use interval=1 for weekly, but monthly can use N.
 */
function nextOccurrenceOnOrAfter(pattern: RecurrencePattern | null, todayYMD: string): string | null {
  if (!pattern) return null
  if (!todayYMD) return null

  /* Daily-style: treat as today (reminder shows today). */
  if (pattern.freq === 'day') return todayYMD

  /* Weekly: choose the next selected weekday on/after today. */
  if (pattern.freq === 'week') {
    const days = Array.isArray(pattern.byDay) ? pattern.byDay : pattern.byDay ? [pattern.byDay] : []
    if (days.length === 0) {
      return todayYMD
    }
    const selected = new Set(days)
    for (let i = 0; i < 14; i++) {
      const d = addDaysYMD(todayYMD, i)
      const dow = new Date(d + 'T12:00:00').getDay()
      const code = RECURRENCE_DAY_CODES[dow]
      if (code && selected.has(code)) return d
    }
    return todayYMD
  }

  /* Monthly: compute this month’s due day (clamped), else jump by interval months. */
  if (pattern.freq === 'month') {
    const [yS, mS] = todayYMD.split('-')
    const y = Number(yS)
    const m = Number(mS) - 1
    const target = typeof pattern.byMonthDay === 'number' ? pattern.byMonthDay : 1
    const dueDay = clampDayForMonth(y, m, target)
    const dueThisMonth = `${y}-${String(m + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`
    if (dueThisMonth >= todayYMD) return dueThisMonth
    return getNextOccurrence(pattern, dueThisMonth)
  }

  /* Fallback for other recurrence types: treat as today. */
  return todayYMD
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
 * Initial todo_remind_at for create/update when add_to_todos is on:
 * set the due instant to the NEXT habit occurrence date (on/after today).
 */
export function computeInitialTodoRemindAtForHabit(
  h: {
    reminder_time: string | null
    desired_action: string | null
    minimum_action: string | null
    frequency: HabitFrequencyCode
    frequency_target: number | null
    monthly_interval?: number | null
    monthly_day?: number | null
  },
  todayYmd: string,
): string | null {
  /* Guard: only schedule when we have reminder time or action text (matches shouldScheduleHabitTodo). */
  const base = computeInitialTodoRemindAt(
    {
      reminder_time: h.reminder_time,
      desired_action: h.desired_action,
      minimum_action: h.minimum_action,
    },
    todayYmd,
  )
  if (!base) return null

  /* Time-of-day: reuse reminder_time if present, else default clock from computeInitialTodoRemindAt. */
  const clock = h.reminder_time && h.reminder_time.trim() !== '' ? h.reminder_time : DEFAULT_HABIT_TODO_CLOCK

  /* Recurrence: pick next due date on/after today based on habit schedule. */
  const patternStr = recurrencePatternJsonForHabit(
    h.frequency,
    h.frequency_target,
    h.monthly_interval ?? null,
    h.monthly_day ?? null,
  )
  const pattern = patternStr ? parseRecurrencePattern(patternStr) : null
  const dueYMD = nextOccurrenceOnOrAfter(pattern, todayYmd) ?? todayYmd
  return habitReminderInstantForLocalDay(dueYMD, clock)
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
    monthly_interval?: number | null
    monthly_day?: number | null
  },
  entryDate: string,
): string | null {
  const currentIso = habit.todo_remind_at
  if (!currentIso) return null

  const dueYMD = isoInstantToLocalCalendarYMD(currentIso)
  if (!dueYMD || dueYMD !== entryDate) {
    return null
  }

  const patternStr = recurrencePatternJsonForHabit(
    habit.frequency,
    habit.frequency_target,
    habit.monthly_interval ?? null,
    habit.monthly_day ?? null,
  )
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
