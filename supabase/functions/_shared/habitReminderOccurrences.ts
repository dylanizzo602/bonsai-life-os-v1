/* habitReminderOccurrences (edge): per-day habit reminder occurrence math for notifications function */

import { DateTime } from 'https://esm.sh/luxon@3.5.0'

const DEFAULT_HABIT_TODO_CLOCK = '09:00:00'
const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const
export const HABIT_REMINDER_LOOKBACK_DAYS = 90

type HabitFrequencyCode = 'daily' | 'weekly' | 'monthly' | 'times_per_day' | 'every_x_days'

type RecurrencePattern = {
  freq: 'day' | 'week' | 'month' | 'year'
  interval: number
  byDay?: string[] | string
  byMonthDay?: number
}

export type HabitOccurrenceSource = {
  id: string
  created_at: string
  frequency: HabitFrequencyCode
  frequency_target: number | null
  monthly_interval?: number | null
  monthly_day?: number | null
  reminder_time: string | null
  todo_remind_at: string | null
}

export type HabitOccurrenceTaskSource = {
  due_date: string | null
}

export type HabitOccurrenceEntry = {
  entry_date: string
  status: 'completed' | 'skipped' | 'minimum'
}

export type MissedHabitOccurrence = {
  habitId: string
  occurrenceDate: string
  remindAt: string
}

const RECURRENCE_DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

function addDaysYMD(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoInstantToLocalCalendarYMD(iso: string | null | undefined): string | null {
  if (iso == null || iso === '') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function recurrencePatternJsonForHabit(
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
    pattern.freq = 'month'
    pattern.interval =
      typeof monthlyInterval === 'number' && Number.isFinite(monthlyInterval)
        ? Math.max(1, Math.trunc(monthlyInterval))
        : 1
    const dayRaw =
      typeof monthlyDay === 'number' && Number.isFinite(monthlyDay) ? Math.trunc(monthlyDay) : 1
    pattern.byMonthDay = dayRaw === -1 ? -1 : Math.max(1, Math.min(31, dayRaw))
  }
  return JSON.stringify(pattern)
}

function parseRecurrencePattern(str: string | null | undefined): RecurrencePattern | null {
  if (!str || typeof str !== 'string' || str.trim() === '') return null
  try {
    const parsed = JSON.parse(str) as RecurrencePattern
    if (!parsed.freq || !['day', 'week', 'month', 'year'].includes(parsed.freq)) return null
    return { ...parsed, interval: Math.max(1, parsed.interval ?? 1) }
  } catch {
    return null
  }
}

function habitReminderInstantForLocalDay(ymd: string, reminderTime: string): string {
  const timePart = reminderTime.length <= 5 ? `${reminderTime}:00` : reminderTime.slice(0, 8)
  const parts = timePart.split(':').map((x) => parseInt(x, 10))
  const hh = parts[0] ?? 0
  const mm = parts[1] ?? 0
  const ss = parts[2] ?? 0
  const [y, mo, d] = ymd.split('-').map(Number)
  const local = new Date(y ?? 0, (mo ?? 1) - 1, d ?? 1, hh, mm, ss)
  return local.toISOString()
}

function hasExplicitTimeInString(isoString: string): boolean {
  const timeMatch = isoString.match(/T(\d{2}):(\d{2})/)
  return !!timeMatch && (timeMatch[1] !== '00' || timeMatch[2] !== '00')
}

function getEffectiveTimeZone(timeZone: string): string {
  return timeZone === 'local' ? 'UTC' : timeZone
}

function toZonedDateTime(isoString: string, timeZone: string): DateTime | null {
  const zone = getEffectiveTimeZone(timeZone)
  if (!isoString.includes('T')) {
    const dt = DateTime.fromISO(isoString, { zone })
    return dt.isValid ? dt : null
  }
  if (!hasExplicitTimeInString(isoString)) {
    const datePart = isoString.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const dt = DateTime.fromISO(datePart, { zone })
      return dt.isValid ? dt : null
    }
  }
  const parsed = DateTime.fromISO(isoString, { setZone: true })
  if (!parsed.isValid) return null
  return parsed.setZone(zone)
}

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

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function clampDayForMonth(year: number, month: number, day: number): number {
  const last = getLastDayOfMonth(year, month)
  if (day === -1 || day > last) return last
  return Math.max(1, Math.min(31, day))
}

function getNextOccurrence(pattern: RecurrencePattern, fromYMD: string): string | null {
  const { year, month, date } = (() => {
    const [y, m, d] = fromYMD.split('-').map(Number)
    return { year: y, month: (m ?? 1) - 1, date: d ?? 1 }
  })()

  if (pattern.freq === 'day') {
    const d = new Date(year, month, date)
    d.setDate(d.getDate() + pattern.interval)
    return addDaysYMD(fromYMD, pattern.interval)
  }

  if (pattern.freq === 'week') {
    return addDaysYMD(fromYMD, 7 * pattern.interval)
  }

  if (pattern.freq === 'month') {
    const target = typeof pattern.byMonthDay === 'number' ? pattern.byMonthDay : 1
    let y = year
    let m = month + pattern.interval
    while (m > 11) {
      m -= 12
      y += 1
    }
    const dueDay = clampDayForMonth(y, m, target)
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`
  }

  return addDaysYMD(fromYMD, 1)
}

function getFutureOccurrences(
  pattern: RecurrencePattern,
  anchorYMD: string,
  fromDate: Date,
  untilDate: Date,
): string[] {
  const results: string[] = []
  let current = anchorYMD
  const untilYMD = addDaysYMD(
    `${untilDate.getFullYear()}-${String(untilDate.getMonth() + 1).padStart(2, '0')}-${String(untilDate.getDate()).padStart(2, '0')}`,
    0,
  )
  let guard = 0
  while (current <= untilYMD && guard < 400) {
    if (current >= addDaysYMD(
      `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`,
      0,
    )) {
      results.push(current)
    }
    const next = getNextOccurrence(pattern, current)
    if (!next || next === current) break
    current = next
    guard++
  }
  return results
}

export function habitReminderLookbackStartYMD(habit: HabitOccurrenceSource, todayYMD: string): string {
  const fromLookback = addDaysYMD(todayYMD, -HABIT_REMINDER_LOOKBACK_DAYS)
  const createdYMD = isoInstantToLocalCalendarYMD(habit.created_at)
  if (createdYMD && createdYMD > fromLookback) return createdYMD
  return fromLookback
}

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

export function habitReminderPushDedupeKey(habitId: string, occurrenceDate: string): string {
  return `habit_reminder_due:${habitId}:${occurrenceDate}`
}

/** Eligibility: habit has add_to_todos and scheduling inputs */
export function isHabitEligibleForTodoReminder(h: {
  add_to_todos: boolean
  todo_remind_at: string | null
  reminder_id: string | null
  reminder_time: string | null
  desired_action: string | null
  minimum_action: string | null
}): boolean {
  if (!h.add_to_todos) return false
  if (h.todo_remind_at) return true
  if (h.reminder_id) return true
  const hasTime = Boolean(h.reminder_time && h.reminder_time.trim() !== '')
  const hasDesiredOrMinimum =
    Boolean(h.desired_action && h.desired_action.trim() !== '') ||
    Boolean(h.minimum_action && h.minimum_action.trim() !== '')
  return hasTime || hasDesiredOrMinimum
}
