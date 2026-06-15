/* habitReminderOccurrences: shared per-day habit reminder occurrence math (client + tests) */

import { DateTime } from 'luxon'
import {
  DEFAULT_HABIT_TODO_CLOCK,
  habitReminderInstantForLocalDay,
  recurrencePatternJsonForHabit,
} from './habitTodoSchedule'
import { isoInstantToLocalCalendarYMD } from './localCalendarDate'
import { getFutureOccurrences, parseRecurrencePattern } from './recurrence'

/** Detect non-midnight time in ISO strings (00:00 treated as date-only). */
function hasExplicitTimeInString(isoString: string): boolean {
  const timeMatch = isoString.match(/T(\d{2}):(\d{2})/)
  return !!timeMatch && (timeMatch[1] !== '00' || timeMatch[2] !== '00')
}

/** Map ISO to DateTime in user zone (date-only uses civil date in zone). */
function toZonedDateTime(isoString: string, timeZone: string): DateTime | null {
  if (!isoString.includes('T')) {
    const dt = DateTime.fromISO(isoString, { zone: timeZone })
    return dt.isValid ? dt : null
  }
  if (!hasExplicitTimeInString(isoString)) {
    const datePart = isoString.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const dt = DateTime.fromISO(datePart, { zone: timeZone })
      return dt.isValid ? dt : null
    }
  }
  const parsed = DateTime.fromISO(isoString, { setZone: true })
  if (!parsed.isValid) return null
  return parsed.setZone(timeZone)
}

/** Combine remind_at with habit wall-clock time in the user's zone. */
function habitReminderEffectiveInstant(
  remindAt: string | null,
  wallTimeHHmm: string | null | undefined,
  timeZone: string,
): string | null {
  if (!remindAt) return null
  if (wallTimeHHmm == null || String(wallTimeHHmm).trim() === '') return remindAt
  const base = toZonedDateTime(remindAt, timeZone)
  if (!base) return remindAt
  const raw = String(wallTimeHHmm).trim()
  const normalized = raw.length <= 5 ? `${raw}:00` : raw.slice(0, 8)
  const parts = normalized.split(':').map((x) => parseInt(x, 10))
  const hh = parts[0] ?? 0
  const mm = parts[1] ?? 0
  const ss = parts[2] ?? 0
  const combined = base.set({ hour: hh, minute: mm, second: ss, millisecond: 0 })
  return combined.toUTC().toISO()
}

/** Minimal habit fields needed for occurrence enumeration */
export type HabitOccurrenceSource = {
  id: string
  created_at: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'times_per_day' | 'every_x_days'
  frequency_target: number | null
  monthly_interval?: number | null
  monthly_day?: number | null
  reminder_time: string | null
  todo_remind_at: string | null
}

/** Minimal linked task fields for due-time reference */
export type HabitOccurrenceTaskSource = {
  due_date: string | null
}

/** Minimal habit entry for resolved checks */
export type HabitOccurrenceEntry = {
  entry_date: string
  status: 'completed' | 'skipped' | 'minimum'
}

export type MissedHabitOccurrence = {
  habitId: string
  occurrenceDate: string
  remindAt: string
}

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

/** How far back to scan for missed habit reminder instances */
export const HABIT_REMINDER_LOOKBACK_DAYS = 90

function addDaysYMD(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Lookback start for missed occurrences (habit creation or 90 days ago). */
export function habitReminderLookbackStartYMD(habit: HabitOccurrenceSource, todayYMD: string): string {
  const fromLookback = addDaysYMD(todayYMD, -HABIT_REMINDER_LOOKBACK_DAYS)
  const createdYMD = isoInstantToLocalCalendarYMD(habit.created_at)
  if (createdYMD && createdYMD > fromLookback) return createdYMD
  return fromLookback
}

/** Resolve the ISO instant when a habit occurrence becomes due on a local calendar day. */
export function remindAtForHabitOccurrenceDate(
  habit: HabitOccurrenceSource,
  task: HabitOccurrenceTaskSource,
  occurrenceDate: string,
  timeZone: string,
): string | null {
  const clock =
    habit.reminder_time && habit.reminder_time.trim() !== ''
      ? habit.reminder_time
      : DEFAULT_HABIT_TODO_CLOCK

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
export function isHabitOccurrenceResolved(
  entries: HabitOccurrenceEntry[],
  occurrenceDate: string,
): boolean {
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
  habit: HabitOccurrenceSource,
  task: HabitOccurrenceTaskSource,
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

  const anchorYMD =
    isoInstantToLocalCalendarYMD(habit.todo_remind_at ?? task.due_date) ?? todayYMD
  const fromDate = new Date(lookbackStartYMD + 'T12:00:00')
  const untilDate = new Date(todayYMD + 'T12:00:00')
  return getFutureOccurrences(pattern, anchorYMD, fromDate, untilDate).filter(
    (d) => d >= lookbackStartYMD && d <= todayYMD,
  )
}

/**
 * Enumerate missed habit occurrences whose remind time has passed and have no resolved entry.
 */
export function listMissedHabitOccurrences(params: {
  habit: HabitOccurrenceSource
  task: HabitOccurrenceTaskSource
  entries: HabitOccurrenceEntry[]
  timeZone: string
  todayYMD: string
  nowMs?: number
}): MissedHabitOccurrence[] {
  const { habit, task, entries, timeZone, todayYMD } = params
  const nowMs = params.nowMs ?? Date.now()
  const lookbackStart = habitReminderLookbackStartYMD(habit, todayYMD)
  const occurrenceDates = listHabitOccurrenceDatesInRange(habit, task, lookbackStart, todayYMD)
  const missed: MissedHabitOccurrence[] = []

  for (const occurrenceDate of occurrenceDates) {
    if (isHabitOccurrenceResolved(entries, occurrenceDate)) continue

    const remindAt = remindAtForHabitOccurrenceDate(habit, task, occurrenceDate, timeZone)
    if (remindAt != null) {
      const dueMs = new Date(remindAt).getTime()
      if (Number.isFinite(dueMs) && dueMs > nowMs) continue
    }

    missed.push({
      habitId: habit.id,
      occurrenceDate,
      remindAt: remindAt ?? new Date(occurrenceDate + 'T12:00:00').toISOString(),
    })
  }

  return missed
}

/** Stable dedupe key for push delivery log (one push per habit per calendar day). */
export function habitReminderPushDedupeKey(habitId: string, occurrenceDate: string): string {
  return `habit_reminder_due:${habitId}:${occurrenceDate}`
}
