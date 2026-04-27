/* Date helpers for task views (e.g. overdue detection, start/due display) — zoned with IANA timeZone */
import { DateTime } from 'luxon'

/**
 * Convert a task ISO date string into a comparable millisecond value in `timeZone`.
 * This is used for filtering/sorting/availability where we must avoid JS `new Date('YYYY-MM-DD')`
 * interpreting date-only strings as UTC midnight (which shifts to the previous local evening).
 *
 * Rules:
 * - Plain `YYYY-MM-DD` is treated as that civil date in `timeZone` at local midnight.
 * - ISO strings with a `T00:00` "midnight placeholder" (legacy) are treated as date-only too.
 * - ISO strings with an explicit clock time compare as instants.
 */
export function taskDateToComparableMs(
  isoString: string | null | undefined,
  timeZone: string,
): number | null {
  if (isoString == null || isoString === '') return null

  /* Date-only or legacy midnight: compare on the local calendar day boundary. */
  const hasT = isoString.includes('T')
  const explicit = hasT && hasExplicitTimeInString(isoString)
  if (!hasT || !explicit) {
    const d = toZonedDateTime(isoString, timeZone)
    if (!d) return null
    return d.startOf('day').toMillis()
  }

  /* Explicit time: compare as an instant, preserving the encoded offset/zone. */
  const instant = DateTime.fromISO(isoString, { setZone: true })
  if (!instant.isValid) return null
  return instant.toMillis()
}

/**
 * Availability: returns true when startDate is unset or start boundary has passed.
 * Date-only start dates become available at the start of that civil day in `timeZone`.
 */
export function isStartAvailableNow(
  startDate: string | null | undefined,
  timeZone: string,
): boolean {
  if (startDate == null || startDate === '') return true
  const startMs = taskDateToComparableMs(startDate, timeZone)
  if (startMs == null) return true
  return startMs <= Date.now()
}

/**
 * Map an ISO due/start string to a DateTime in the user's zone for calendar-day and display logic.
 * Plain YYYY-MM-DD is that civil date in `timeZone`.
 * UTC midnight (T00:00:00Z) with no real wall time is treated as the **date part only** (matches date picker),
 * not as an instant that shifts to the previous local day.
 * Non-midnight times use the instant, then convert to `timeZone`.
 */
function toZonedDateTime(
  isoString: string | null | undefined,
  timeZone: string,
): DateTime | null {
  if (isoString == null || isoString === '') return null
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

/** Detect non-midnight time in the raw string (00:00 is treated as date-only / legacy UTC midnight). */
function hasExplicitTimeInString(isoString: string): boolean {
  const timeMatch = isoString.match(/T(\d{2}):(\d{2})/)
  return !!timeMatch && (timeMatch[1] !== '00' || timeMatch[2] !== '00')
}

/**
 * Returns true if dueDate is set and is now or earlier (overdue).
 * Date-only (YYYY-MM-DD) is end of that civil day in `timeZone`.
 * Legacy UTC midnight (T00:00:00Z) uses end of that calendar day in `timeZone`.
 * Explicit times compare instants to now.
 */
export function isOverdue(dueDate: string | null | undefined, timeZone: string): boolean {
  if (!dueDate) return false
  const hasT = dueDate.includes('T')
  const explicit = hasExplicitTimeInString(dueDate)
  if (!hasT) {
    const end = DateTime.fromISO(dueDate, { zone: timeZone }).endOf('day')
    if (!end.isValid) return false
    return end.toMillis() < Date.now()
  }
  if (!explicit) {
    const z = toZonedDateTime(dueDate, timeZone)
    if (!z) return false
    return z.endOf('day').toMillis() < Date.now()
  }
  const instant = DateTime.fromISO(dueDate, { setZone: true })
  if (!instant.isValid) return false
  return instant.toMillis() < Date.now()
}

/**
 * Returns true if startDate is set and now is after the start boundary.
 * Same date-only / midnight / explicit-time rules as isOverdue.
 */
export function isPastStartDate(startDate: string | null | undefined, timeZone: string): boolean {
  if (!startDate) return false
  const hasT = startDate.includes('T')
  const explicit = hasExplicitTimeInString(startDate)
  if (!hasT) {
    const end = DateTime.fromISO(startDate, { zone: timeZone }).endOf('day')
    if (!end.isValid) return false
    return end.toMillis() < Date.now()
  }
  if (!explicit) {
    const z = toZonedDateTime(startDate, timeZone)
    if (!z) return false
    return z.endOf('day').toMillis() < Date.now()
  }
  const instant = DateTime.fromISO(startDate, { setZone: true })
  if (!instant.isValid) return false
  return instant.toMillis() < Date.now()
}

/** Classification for due dates: none (no special status), dueSoon (within 24h), overdue (past end of due day). */
export type DueStatus = 'none' | 'dueSoon' | 'overdue'

/** For timed dues, amber “due soon” only in the last hour before the instant (not all morning on due day). */
const DUE_SOON_BEFORE_INSTANT_MS = 60 * 60 * 1000

/**
 * Get due status for a given due date in `timeZone`:
 * - Date-only / legacy midnight: same as before — overdue if day before today; dueSoon if due calendar day is today or next day starts within 24h.
 * - Explicit clock time: compare instants — overdue after due time; dueSoon only in the hour before; neutral until then.
 */
export function getDueStatus(dueDate: string | null | undefined, timeZone: string): DueStatus {
  if (!dueDate) return 'none'
  const due = toZonedDateTime(dueDate, timeZone)
  if (!due) return 'none'

  const hasT = dueDate.includes('T')
  const explicit = hasExplicitTimeInString(dueDate)

  /* Timed reminder / due-at: do not treat “today” as due-soon until we are near or past the clock time */
  if (hasT && explicit) {
    const instant = DateTime.fromISO(dueDate, { setZone: true })
    if (!instant.isValid) return 'none'
    const dueMs = instant.toMillis()
    const nowMs = Date.now()
    if (dueMs < nowMs) return 'overdue'
    const untilDue = dueMs - nowMs
    if (untilDue <= DUE_SOON_BEFORE_INSTANT_MS) return 'dueSoon'
    return 'none'
  }

  const now = DateTime.now().setZone(timeZone)
  const todayStart = now.startOf('day')
  const dueDayStart = due.startOf('day')

  const todayKey = todayStart.year * 10000 + todayStart.month * 100 + todayStart.day
  const dueKey = dueDayStart.year * 10000 + dueDayStart.month * 100 + dueDayStart.day

  if (dueKey < todayKey) return 'overdue'
  if (dueKey === todayKey) return 'dueSoon'

  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
  const diff = dueDayStart.toMillis() - now.toMillis()
  if (diff >= 0 && diff <= TWENTY_FOUR_HOURS_MS) return 'dueSoon'
  return 'none'
}

/** Return true when an ISO string is today's calendar day in `timeZone`. */
function isTodayInZone(isoString: string | null | undefined, timeZone: string): boolean {
  const d = toZonedDateTime(isoString, timeZone)
  if (!d) return false
  const now = DateTime.now().setZone(timeZone)
  return d.year === now.year && d.month === now.month && d.day === now.day
}

/** Return true when an ISO string is tomorrow's calendar day in `timeZone`. */
function isTomorrowInZone(isoString: string | null | undefined, timeZone: string): boolean {
  const d = toZonedDateTime(isoString, timeZone)
  if (!d) return false
  const tomorrow = DateTime.now().setZone(timeZone).plus({ days: 1 }).startOf('day')
  const dueDay = d.startOf('day')
  return (
    dueDay.year === tomorrow.year &&
    dueDay.month === tomorrow.month &&
    dueDay.day === tomorrow.day
  )
}

/** Return true when an ISO string is yesterday's calendar day in `timeZone`. */
function isYesterdayInZone(isoString: string | null | undefined, timeZone: string): boolean {
  const d = toZonedDateTime(isoString, timeZone)
  if (!d) return false
  const yesterday = DateTime.now().setZone(timeZone).plus({ days: -1 }).startOf('day')
  const day = d.startOf('day')
  return day.year === yesterday.year && day.month === yesterday.month && day.day === yesterday.day
}

/** Format wall time for display when the raw ISO encodes a non-midnight time (or legacy rules). */
function formatWallTimeInZone(isoString: string | null | undefined, timeZone: string): string {
  const d = toZonedDateTime(isoString, timeZone)
  if (!d) return ''
  return d.toLocaleString({
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Build "Due Today" / "Due Tomorrow" with optional " at {time}" when due has explicit time in string. */
function getDueTodayOrTomorrowLabel(
  dueDate: string | null | undefined,
  dayLabel: 'Today' | 'Tomorrow',
  timeZone: string,
): string {
  const d = toZonedDateTime(dueDate, timeZone)
  if (!d) return `Due ${dayLabel}`
  const hasT = dueDate?.includes('T')
  const explicit = hasT && hasExplicitTimeInString(dueDate ?? '')
  if (!hasT || !explicit) return `Due ${dayLabel}`
  const timeStr = formatWallTimeInZone(dueDate, timeZone)
  return `Due ${dayLabel} at ${timeStr}`
}

/** Build "Today" / "Tomorrow" or "Today at {time}" for start–due range. */
function getDueDayOnlyLabel(
  dueDate: string | null | undefined,
  dayLabel: 'Today' | 'Tomorrow',
  timeZone: string,
): string {
  const d = toZonedDateTime(dueDate, timeZone)
  if (!d) return dayLabel
  const hasT = dueDate?.includes('T')
  const explicit = hasT && hasExplicitTimeInString(dueDate ?? '')
  if (!hasT || !explicit) return dayLabel
  const timeStr = formatWallTimeInZone(dueDate, timeZone)
  return `${dayLabel} at ${timeStr}`
}

/** Build "Yesterday" / "Today" / "Tomorrow" with optional " at {time}" when start has explicit time. */
function getStartDayOnlyLabel(
  startDate: string | null | undefined,
  dayLabel: 'Yesterday' | 'Today' | 'Tomorrow',
  timeZone: string,
): string {
  const d = toZonedDateTime(startDate, timeZone)
  if (!d) return dayLabel
  const hasT = startDate?.includes('T')
  const explicit = hasT && hasExplicitTimeInString(startDate ?? '')
  if (!hasT || !explicit) return dayLabel
  const timeStr = formatWallTimeInZone(startDate, timeZone)
  return `${dayLabel} at ${timeStr}`
}

/** Ordinal suffix for day of month: 1st, 2nd, 3rd, 4th, ... */
function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

/** Format date with ordinal day for "Starts Oct 6th" style in `timeZone`. */
export function formatDateWithOrdinal(
  isoString: string | null | undefined,
  timeZone: string,
): string | null {
  const d = toZonedDateTime(isoString, timeZone)
  if (!d) return null
  const month = d.toLocaleString({ month: 'short' })
  const day = d.day
  return `${month} ${day}${ordinalSuffix(day)}`
}

/** Format as "Jan 22" in `timeZone` for pills and inputs. */
export function formatDateShort(isoString: string | null | undefined, timeZone: string): string | null {
  const d = toZonedDateTime(isoString, timeZone)
  if (!d) return null
  return d.toLocaleString({ month: 'short', day: 'numeric' })
}

/** Format as "Jan 1, 2025" in `timeZone` for tooltips (matches zoned due labels). */
export function formatDateTooltipLong(isoString: string | null | undefined, timeZone: string): string | null {
  const d = toZonedDateTime(isoString, timeZone)
  if (!d) return null
  return d.toLocaleString({ month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Format ISO date as "Jan 22" or "Jan 22 at 3:00pm" when time present.
 * Midnight-only strings (no explicit time) omit the time portion.
 */
function formatDateWithOptionalTime(
  isoString: string | null | undefined,
  timeZone: string,
): string | null {
  /* Date parse: normalize the ISO string into a user's zoned DateTime */
  const d = toZonedDateTime(isoString, timeZone)
  if (!d) return null

  /* Relative-weekday display: for upcoming dates in the next 7 days, show "Mon/Tue/..." instead of "Jan 22" */
  const nowDay = DateTime.now().setZone(timeZone).startOf('day')
  const targetDay = d.startOf('day')
  const daysAhead = Math.round(targetDay.diff(nowDay, 'days').days)
  const isWithinNextWeek = daysAhead >= 0 && daysAhead <= 7

  const hasT = isoString?.includes('T')
  const explicit = hasT && hasExplicitTimeInString(isoString ?? '')
  const isDateOnly = !hasT || !explicit

  const dateStr = isWithinNextWeek
    ? d.toLocaleString({ weekday: 'short' })
    : d.toLocaleString({ month: 'short', day: 'numeric' })
  if (isDateOnly) return dateStr

  const timeStr = formatWallTimeInZone(isoString, timeZone)
  return `${dateStr} at ${timeStr}`
}

/**
 * Single display string for task start/due dates in `timeZone`.
 */
export function formatStartDueDisplay(
  startDate: string | null | undefined,
  dueDate: string | null | undefined,
  timeZone: string,
): string | null {
  /* Presence checks: keep empty-string safety consistent across callers */
  const hasStart = startDate != null && startDate !== ''
  const hasDue = dueDate != null && dueDate !== ''
  if (!hasStart && !hasDue) return null
  if (hasStart && !hasDue) {
    /* Start-only display: use relative day words (Yesterday/Today/Tomorrow) when applicable */
    const isYesterday = isYesterdayInZone(startDate, timeZone)
    const isToday = isTodayInZone(startDate, timeZone)
    const isTomorrow = isTomorrowInZone(startDate, timeZone)

    if (isYesterday) return 'Started Yesterday'
    if (isToday) return isPastStartDate(startDate, timeZone) ? 'Started Today' : 'Starts Today'
    if (isTomorrow) return 'Starts Tomorrow'

    const formatted =
      formatDateWithOrdinal(startDate, timeZone) ?? formatDateWithOptionalTime(startDate, timeZone)
    if (!formatted) return null
    return isPastStartDate(startDate, timeZone) ? `Started ${formatted}` : `Starts ${formatted}`
  }
  if (!hasStart && hasDue) {
    if (isTodayInZone(dueDate, timeZone)) return getDueTodayOrTomorrowLabel(dueDate, 'Today', timeZone)
    if (isTomorrowInZone(dueDate, timeZone))
      return getDueTodayOrTomorrowLabel(dueDate, 'Tomorrow', timeZone)
    const formatted = formatDateWithOptionalTime(dueDate, timeZone)
    return formatted ? `Due ${formatted}` : null
  }
  /* hasStart && hasDue */
  const isDueToday = isTodayInZone(dueDate, timeZone)
  const isDueTomorrow = isTomorrowInZone(dueDate, timeZone)
  const dueFormatted = formatDateWithOptionalTime(dueDate, timeZone)
  if (!dueFormatted && !isDueToday && !isDueTomorrow) return null

  if (isPastStartDate(startDate, timeZone)) {
    if (isDueToday) return getDueTodayOrTomorrowLabel(dueDate, 'Today', timeZone)
    if (isDueTomorrow) return getDueTodayOrTomorrowLabel(dueDate, 'Tomorrow', timeZone)
    return `Due ${dueFormatted}`
  }

  /* Start–due range display: prefer relative day words for the start segment when applicable */
  const startFormatted = isYesterdayInZone(startDate, timeZone)
    ? getStartDayOnlyLabel(startDate, 'Yesterday', timeZone)
    : isTodayInZone(startDate, timeZone)
      ? getStartDayOnlyLabel(startDate, 'Today', timeZone)
      : isTomorrowInZone(startDate, timeZone)
        ? getStartDayOnlyLabel(startDate, 'Tomorrow', timeZone)
        : formatDateWithOptionalTime(startDate, timeZone)
  if (isDueToday) {
    const dayLabel = getDueDayOnlyLabel(dueDate, 'Today', timeZone)
    return startFormatted ? `${startFormatted} - ${dayLabel}` : `Due ${dayLabel}`
  }
  if (isDueTomorrow) {
    const dayLabel = getDueDayOnlyLabel(dueDate, 'Tomorrow', timeZone)
    return startFormatted ? `${startFormatted} - ${dayLabel}` : `Due ${dayLabel}`
  }

  return startFormatted ? `${startFormatted} - ${dueFormatted}` : `Due ${dueFormatted}`
}

/**
 * Habit reminders: combine reminder.remind_at with habit.reminder_time (wall clock in settings).
 * Returns an ISO instant for due labels and overdue logic in the user's zone.
 */
export function habitReminderEffectiveInstant(
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
