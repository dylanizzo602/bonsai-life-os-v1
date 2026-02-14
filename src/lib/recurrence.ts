/* Recurrence: Types and helpers for recurring tasks/reminders (parse, serialize, format, getNextOccurrence, getFutureOccurrences) */

/** Frequency unit for recurrence */
export type RecurrenceFreq = 'day' | 'week' | 'month' | 'year'

/** Parsed recurrence pattern stored as JSON string in tasks.recurrence_pattern */
export interface RecurrencePattern {
  freq: RecurrenceFreq
  interval: number
  /** Weekly: multiple days e.g. ["MO","TH"]. Monthly by week: single day e.g. "TH" */
  byDay?: string[] | string
  /** Monthly on date: 1-31 or -1 for last day. Yearly: 1-31 */
  byMonthDay?: number
  /** Monthly by week: 1=First, 2=Second, 3=Third, 4=Fourth, 5=Fifth week of month */
  bySetPos?: number
  /** Yearly: 1-12 (January-December) */
  byMonth?: number
  /** End date when "Ends on" is used (YYYY-MM-DD) */
  until?: string | null
  /** Reopen checklist items when task reoccurs */
  reopenChecklist?: boolean
}

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SET_POS_LABELS = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth']

/** Parse recurrence_pattern JSON string to RecurrencePattern object, or null if invalid/empty */
export function parseRecurrencePattern(str: string | null | undefined): RecurrencePattern | null {
  if (!str || typeof str !== 'string' || str.trim() === '') return null
  try {
    const parsed = JSON.parse(str) as RecurrencePattern
    if (!parsed.freq || !['day', 'week', 'month', 'year'].includes(parsed.freq)) return null
    return {
      ...parsed,
      interval: Math.max(1, parsed.interval ?? 1),
      until: parsed.until ?? null,
    }
  } catch {
    return null
  }
}

/** Serialize RecurrencePattern to JSON string for storage */
export function serializeRecurrencePattern(pattern: RecurrencePattern | null): string | null {
  if (!pattern) return null
  return JSON.stringify(pattern)
}

/** Return YYYY-MM-DD for a Date (local date) */
function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse YYYY-MM-DD to { year, month (0-11), date } */
function parseYMD(ymd: string): { year: number; month: number; date: number } {
  const [y, m, d] = ymd.split('-').map(Number)
  return { year: y, month: (m ?? 1) - 1, date: d ?? 1 }
}

/** Get last day of month (28-31) */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Clamp day to valid range for month; day 31 in Feb returns 28/29 */
function clampDayForMonth(year: number, month: number, day: number): number {
  const last = getLastDayOfMonth(year, month)
  if (day === -1 || day > last) return last
  return Math.max(1, Math.min(31, day))
}

/** Format weekday codes to readable string (e.g. ["MO","TH"] -> "Mon, Thu") */
function formatByDay(byDay: string[] | string): string {
  const codes = Array.isArray(byDay) ? byDay : [byDay]
  const labels: Record<string, string> = {
    SU: 'Sun', MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat',
  }
  return codes.map((c) => labels[c] ?? c).join(', ')
}

/** Human-readable tooltip for recurrence pattern */
export function formatRecurrenceForTooltip(pattern: RecurrencePattern | null): string {
  if (!pattern) return ''
  const n = pattern.interval

  if (pattern.freq === 'day') {
    return n === 1 ? 'Every day' : `Every ${n} days`
  }

  if (pattern.freq === 'week') {
    const days = pattern.byDay
    const dayStr = Array.isArray(days) && days.length > 0
      ? ` on ${formatByDay(days)}`
      : ''
    return n === 1 ? `Every week${dayStr}` : `Every ${n} weeks${dayStr}`
  }

  if (pattern.freq === 'month') {
    if (pattern.bySetPos != null && pattern.bySetPos >= 1 && pattern.bySetPos <= 5) {
      const weekLabel = SET_POS_LABELS[pattern.bySetPos]
      const day = Array.isArray(pattern.byDay) ? pattern.byDay[0] : pattern.byDay
      const labels: Record<string, string> = {
        SU: 'Sunday', MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday',
        TH: 'Thursday', FR: 'Friday', SA: 'Saturday',
      }
      const dayLabel = day ? labels[day] ?? day : ''
      return n === 1
        ? `Every month on the ${weekLabel.toLowerCase()} ${dayLabel}`
        : `Every ${n} months on the ${weekLabel.toLowerCase()} ${dayLabel}`
    }
    const day = pattern.byMonthDay
    const dayStr = day === -1 ? 'last day' : day == null ? '' : day === 1 ? '1st' : day === 2 ? '2nd' : day === 3 ? '3rd' : `${day}th`
    return n === 1
      ? `Every month on the ${dayStr}`
      : `Every ${n} months on the ${dayStr}`
  }

  if (pattern.freq === 'year') {
    const m = pattern.byMonth ?? 1
    const d = pattern.byMonthDay ?? 1
    const monthName = MONTH_NAMES_SHORT[m - 1] ?? ''
    const dayStr = d === -1 ? 'last day' : d === 1 ? '1st' : d === 2 ? '2nd' : d === 3 ? '3rd' : `${d}th`
    return n === 1
      ? `Every year on ${monthName} ${dayStr}`
      : `Every ${n} years on ${monthName} ${dayStr}`
  }

  return ''
}

/** Get the next occurrence date (YYYY-MM-DD) after currentDueYMD, based on recurrence pattern */
export function getNextOccurrence(pattern: RecurrencePattern | null, currentDueYMD: string): string | null {
  if (!pattern || !currentDueYMD) return null
  const { year, month, date } = parseYMD(currentDueYMD)
  const untilDate = pattern.until ? parseYMD(pattern.until) : null

  const addDays = (d: Date, n: number): Date => {
    const out = new Date(d)
    out.setDate(out.getDate() + n)
    return out
  }

  const addMonths = (d: Date, n: number): Date => {
    const out = new Date(d)
    out.setMonth(out.getMonth() + n)
    return out
  }

  const isBeforeOrEqual = (ymd: string, limit: { year: number; month: number; date: number }): boolean => {
    const p = parseYMD(ymd)
    if (p.year < limit.year) return true
    if (p.year > limit.year) return false
    if (p.month < limit.month) return true
    if (p.month > limit.month) return false
    return p.date <= limit.date
  }

  let next: Date | null = null

  if (pattern.freq === 'day') {
    next = addDays(new Date(year, month, date), pattern.interval)
  } else if (pattern.freq === 'week') {
    const days = Array.isArray(pattern.byDay) ? pattern.byDay : pattern.byDay ? [pattern.byDay] : []
    const current = new Date(year, month, date)
    const anchor = new Date(year, month, date)

    if (days.length === 0) {
      next = addDays(current, 7 * pattern.interval)
    } else {
      const validDows = days
        .map((d) => DAY_CODES.indexOf(d as (typeof DAY_CODES)[number]))
        .filter((i) => i >= 0)
      if (validDows.length === 0) {
        next = addDays(current, 7 * pattern.interval)
      } else {
        const isOnValidDay = validDows.includes(current.getDay())
        if (isOnValidDay) {
          /* Already on a recurrence day: advance by full interval (e.g. 2 weeks, not 1) */
          next = addDays(current, 7 * pattern.interval)
        } else {
          /* Not on a byDay: find next date that is (1) a byDay and (2) in a valid cycle (week 0, interval, 2*interval, ... from anchor) */
          const anchorMs = anchor.getTime()
          const msPerWeek = 7 * 24 * 60 * 60 * 1000
          let d = addDays(current, 1)
          for (let i = 0; i < 60; i++) {
            if (!validDows.includes(d.getDay())) {
              d = addDays(d, 1)
              continue
            }
            const weeksSince = Math.floor((d.getTime() - anchorMs) / msPerWeek)
            if (weeksSince % pattern.interval === 0) {
              next = d
              break
            }
            d = addDays(d, 1)
          }
          next = next ?? addDays(current, 7 * pattern.interval)
        }
      }
    }
  } else if (pattern.freq === 'month') {
    const intervalMonths = Math.max(1, pattern.interval ?? 1)
    if (pattern.bySetPos != null && pattern.bySetPos >= 1 && pattern.bySetPos <= 5) {
      const targetDay = Array.isArray(pattern.byDay) ? pattern.byDay[0] : pattern.byDay
      const targetDow = targetDay ? DAY_CODES.indexOf(targetDay as (typeof DAY_CODES)[number]) : 0
      const nextMonth = addMonths(new Date(year, month, 1), intervalMonths)
      const first = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1)
      const firstDow = first.getDay()
      let offset = (targetDow - firstDow + 7) % 7
      offset += (pattern.bySetPos - 1) * 7
      const d = new Date(first.getFullYear(), first.getMonth(), 1 + offset)
      next = d
    } else {
      /* Monthly on date: use byMonthDay (selected dropdown day), advance by interval months */
      const targetDay = pattern.byMonthDay ?? date
      const nextMonthFirst = addMonths(new Date(year, month, 1), intervalMonths)
      const clamped = clampDayForMonth(nextMonthFirst.getFullYear(), nextMonthFirst.getMonth(), targetDay === -1 ? 31 : targetDay)
      next = new Date(nextMonthFirst.getFullYear(), nextMonthFirst.getMonth(), clamped)
    }
  } else if (pattern.freq === 'year') {
    const intervalYears = Math.max(1, pattern.interval ?? 1)
    const m = (pattern.byMonth ?? month + 1) - 1
    const day = pattern.byMonthDay ?? date
    const nextYear = year + intervalYears
    const clamped = clampDayForMonth(nextYear, m, day === -1 ? 31 : day)
    next = new Date(nextYear, m, clamped)
  } else {
    return null
  }

  if (!next) return null
  const nextYMD = toYMD(next)
  if (untilDate && !isBeforeOrEqual(nextYMD, untilDate)) return null
  return nextYMD
}

/** Get the previous occurrence date before currentYMD (used for calendar shading when range starts before due) */
function getPreviousOccurrence(pattern: RecurrencePattern, currentYMD: string): string | null {
  if (!pattern || !currentYMD) return null
  const { year, month, date } = parseYMD(currentYMD)
  const addDays = (d: Date, n: number): Date => {
    const out = new Date(d)
    out.setDate(out.getDate() + n)
    return out
  }

  if (pattern.freq === 'day') {
    return toYMD(addDays(new Date(year, month, date), -pattern.interval))
  }
  if (pattern.freq === 'week') {
    return toYMD(addDays(new Date(year, month, date), -7 * pattern.interval))
  }
  if (pattern.freq === 'month') {
    const intervalMonths = Math.max(1, pattern.interval ?? 1)
    if (pattern.bySetPos != null && pattern.bySetPos >= 1 && pattern.bySetPos <= 5) {
      const targetDay = Array.isArray(pattern.byDay) ? pattern.byDay[0] : pattern.byDay
      const targetDow = targetDay ? DAY_CODES.indexOf(targetDay as (typeof DAY_CODES)[number]) : 0
      const prevMonth = new Date(year, month - intervalMonths, 1)
      const first = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1)
      const firstDow = first.getDay()
      let offset = (targetDow - firstDow + 7) % 7
      offset += (pattern.bySetPos - 1) * 7
      const d = new Date(first.getFullYear(), first.getMonth(), 1 + offset)
      return toYMD(d)
    }
    const targetDay = pattern.byMonthDay ?? date
    const prevMonthFirst = new Date(year, month - intervalMonths, 1)
    const clamped = clampDayForMonth(prevMonthFirst.getFullYear(), prevMonthFirst.getMonth(), targetDay === -1 ? 31 : targetDay)
    return toYMD(new Date(prevMonthFirst.getFullYear(), prevMonthFirst.getMonth(), clamped))
  }
  if (pattern.freq === 'year') {
    const intervalYears = Math.max(1, pattern.interval ?? 1)
    const m = (pattern.byMonth ?? month + 1) - 1
    const day = pattern.byMonthDay ?? date
    const prevYear = year - intervalYears
    const clamped = clampDayForMonth(prevYear, m, day === -1 ? 31 : day)
    return toYMD(new Date(prevYear, m, clamped))
  }
  return null
}

/** Get array of occurrence dates (YYYY-MM-DD) in range [fromDate, untilDate] for calendar shading */
export function getFutureOccurrences(
  pattern: RecurrencePattern | null,
  dueDateYMD: string,
  fromDate: Date,
  untilDate?: Date | null
): string[] {
  if (!pattern || !dueDateYMD) return []
  const results: string[] = []
  const fromYMD = toYMD(fromDate)
  const endYMD = untilDate ? toYMD(untilDate) : pattern.until ?? null

  /* Walk backward from due to collect occurrences before due that fall in range */
  let current = dueDateYMD
  const seen = new Set<string>()
  for (let i = 0; i < 100; i++) {
    if (current >= fromYMD && (!endYMD || current <= endYMD) && !seen.has(current)) {
      seen.add(current)
      results.push(current)
    }
    if (current <= fromYMD) break
    const prev = getPreviousOccurrence(pattern, current)
    if (!prev || prev >= current) break
    current = prev
  }

  /* Walk forward from due to collect occurrences after due */
  current = dueDateYMD
  for (let i = 0; i < 500; i++) {
    const next = getNextOccurrence(pattern, current)
    if (!next || next === current) break
    if (next >= fromYMD && (!endYMD || next <= endYMD) && !seen.has(next)) {
      seen.add(next)
      results.push(next)
    }
    if (endYMD && next > endYMD) break
    current = next
  }

  return results.sort()
}
