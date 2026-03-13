/* Date helpers for task views (e.g. overdue detection, start/due display) */

/**
 * Returns true if dueDate is set and is now or earlier (overdue).
 * Date-only (YYYY-MM-DD) is treated as end of that day in local time.
 */
export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  const isDateOnly = !dueDate.includes('T')
  const endOfDue =
    isDateOnly
      ? (() => {
          const [y, m, day] = dueDate.split('-').map(Number)
          const d = new Date(y, (m ?? 1) - 1, day ?? 1)
          d.setHours(23, 59, 59, 999)
          return d.getTime()
        })()
      : new Date(dueDate).getTime()
  if (Number.isNaN(endOfDue)) return false
  return endOfDue < Date.now()
}

/**
 * Returns true if startDate is set and now is after the start date.
 * Date-only (YYYY-MM-DD) is treated as end of that day in local time.
 */
export function isPastStartDate(startDate: string | null | undefined): boolean {
  if (!startDate) return false
  const isDateOnly = !startDate.includes('T')
  const endOfStart =
    isDateOnly
      ? (() => {
          const [y, m, day] = startDate.split('-').map(Number)
          const d = new Date(y, (m ?? 1) - 1, day ?? 1)
          d.setHours(23, 59, 59, 999)
          return d.getTime()
        })()
      : new Date(startDate).getTime()
  if (Number.isNaN(endOfStart)) return false
  return endOfStart < Date.now()
}

/** Classification for due dates: none (no special status), dueSoon (within 24h), overdue (past end of due day). */
export type DueStatus = 'none' | 'dueSoon' | 'overdue'

/**
 * Get due status for a given due date:
 * - 'overdue': due calendar day is strictly before today.
 * - 'dueSoon': due calendar day is today, or in the future but within the next 24 hours.
 * - 'none': all other cases (no due date or further in the future).
 */
export function getDueStatus(dueDate: string | null | undefined): DueStatus {
  if (!dueDate) return 'none'
  const due = parseISODateLocal(dueDate)
  if (!due) return 'none'

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
  const todayKey = todayStart.getFullYear() * 10000 + (todayStart.getMonth() + 1) * 100 + todayStart.getDate()
  const dueKey = due.getFullYear() * 10000 + (due.getMonth() + 1) * 100 + due.getDate()

  if (dueKey < todayKey) return 'overdue'
  if (dueKey === todayKey) return 'dueSoon'

  // Future date: mark as dueSoon when the start of that day is within the next 24 hours.
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 0, 0, 0, 0)
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
  const diff = dueStart.getTime() - today.getTime()

  if (diff >= 0 && diff <= TWENTY_FOUR_HOURS_MS) return 'dueSoon'
  return 'none'
}

/** Parse ISO to Date using local date for date-only/midnight so timezone does not shift the calendar day (e.g. Feb 28 UTC midnight stays Feb 28 local) */
function parseISODateLocal(isoString: string | null | undefined): Date | null {
  if (isoString == null || isoString === '') return null
  const timeMatch = isoString.match(/T(\d{2}):(\d{2})/)
  const hasExplicitTime =
    !!timeMatch && (timeMatch[1] !== '00' || timeMatch[2] !== '00')
  const isDateOnly = !isoString.includes('T') || !hasExplicitTime
  if (isDateOnly) {
    const datePart = isoString.includes('T') ? isoString.slice(0, 10) : isoString
    const [y, m, day] = datePart.split('-').map(Number)
    const d = new Date(y ?? 0, (m ?? 1) - 1, day ?? 1)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(isoString)
  return isNaN(d.getTime()) ? null : d
}

/** Return true when an ISO string refers to today's local calendar day (ignoring time). */
function isTodayISO(isoString: string | null | undefined): boolean {
  const d = parseISODateLocal(isoString)
  if (!d) return false
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

/** Return true when an ISO string refers to tomorrow's local calendar day (ignoring time). */
function isTomorrowISO(isoString: string | null | undefined): boolean {
  const d = parseISODateLocal(isoString)
  if (!d) return false
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  )
}

/** Build "Due Today" / "Due Tomorrow" with optional " at {time}" when due date has explicit time. */
function getDueTodayOrTomorrowLabel(
  dueDate: string | null | undefined,
  dayLabel: 'Today' | 'Tomorrow'
): string {
  const d = parseISODateLocal(dueDate)
  if (!d) return `Due ${dayLabel}`
  const timeMatch = dueDate?.match(/T(\d{2}):(\d{2})/)
  const hasExplicitTime =
    !!timeMatch && (timeMatch[1] !== '00' || timeMatch[2] !== '00')
  if (!dueDate?.includes('T') || !hasExplicitTime) return `Due ${dayLabel}`
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `Due ${dayLabel} at ${timeStr}`
}

/** Build "Today" / "Tomorrow" or "Today at {time}" / "Tomorrow at {time}" for use in start–due range. */
function getDueDayOnlyLabel(
  dueDate: string | null | undefined,
  dayLabel: 'Today' | 'Tomorrow'
): string {
  const d = parseISODateLocal(dueDate)
  if (!d) return dayLabel
  const timeMatch = dueDate?.match(/T(\d{2}):(\d{2})/)
  const hasExplicitTime =
    !!timeMatch && (timeMatch[1] !== '00' || timeMatch[2] !== '00')
  if (!dueDate?.includes('T') || !hasExplicitTime) return dayLabel
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${dayLabel} at ${timeStr}`
}

/** Ordinal suffix for day of month: 1st, 2nd, 3rd, 4th, ... */
function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

/** Format date with ordinal day for "Starts Oct 6th" style (date-only or midnight treated as local). */
export function formatDateWithOrdinal(isoString: string | null | undefined): string | null {
  const d = parseISODateLocal(isoString)
  if (!d) return null
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()
  return `${month} ${day}${ordinalSuffix(day)}`
}

/** Format as "Jan 22" using local date (date-only/midnight not shifted by timezone). For use in pills and inputs. */
export function formatDateShort(isoString: string | null | undefined): string | null {
  const d = parseISODateLocal(isoString)
  if (!d) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format ISO date as "Jan 22" or "Jan 22 at 3:00pm" when time present.
 * Treats strings that only encode a midnight time (e.g. "2026-03-31T00:00:00+00:00")
 * as date-only so that clearing time or storing date-only values does not show
 * a phantom time from timezone conversion.
 */
function formatDateWithOptionalTime(isoString: string | null | undefined): string | null {
  const d = parseISODateLocal(isoString)
  if (!d) return null

  const timeMatch = isoString?.match(/T(\d{2}):(\d{2})/)
  const hasExplicitTime =
    !!timeMatch && (timeMatch[1] !== '00' || timeMatch[2] !== '00')
  const isDateOnly = !isoString?.includes('T') || !hasExplicitTime

  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (isDateOnly) return dateStr

  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${dateStr} at ${timeStr}`
}

/**
 * Single display string for task start/due dates:
 * - No dates: null
 * - Start only, future: "Starts Jan 1"
 * - Start only, past: "Started Jan 1"
 * - Due only: "Due Jan 3 at 5pm"
 * - Start + due, not yet at start: "Jan 1 - Jan 3 at 5pm"
 * - Start + due, past start: "Due Jan 3 at 5pm"
 */
export function formatStartDueDisplay(
  startDate: string | null | undefined,
  dueDate: string | null | undefined
): string | null {
  const hasStart = startDate != null && startDate !== ''
  const hasDue = dueDate != null && dueDate !== ''
  if (!hasStart && !hasDue) return null
  if (hasStart && !hasDue) {
    const isToday = isTodayISO(startDate)
    const formatted = formatDateWithOrdinal(startDate) ?? formatDateWithOptionalTime(startDate)
    if (!formatted && !isToday) return null
    if (isToday) {
      return isPastStartDate(startDate) ? 'Started Today' : 'Starts Today'
    }
    return isPastStartDate(startDate) ? `Started ${formatted}` : `Starts ${formatted}`
  }
  if (!hasStart && hasDue) {
    if (isTodayISO(dueDate)) return getDueTodayOrTomorrowLabel(dueDate, 'Today')
    if (isTomorrowISO(dueDate)) return getDueTodayOrTomorrowLabel(dueDate, 'Tomorrow')
    const formatted = formatDateWithOptionalTime(dueDate)
    return formatted ? `Due ${formatted}` : null
  }
  /* hasStart && hasDue */
  const isDueToday = isTodayISO(dueDate)
  const isDueTomorrow = isTomorrowISO(dueDate)
  const dueFormatted = formatDateWithOptionalTime(dueDate)
  if (!dueFormatted && !isDueToday && !isDueTomorrow) return null

  if (isPastStartDate(startDate)) {
    if (isDueToday) return getDueTodayOrTomorrowLabel(dueDate, 'Today')
    if (isDueTomorrow) return getDueTodayOrTomorrowLabel(dueDate, 'Tomorrow')
    return `Due ${dueFormatted}`
  }

  const startFormatted = formatDateWithOptionalTime(startDate)
  if (isDueToday) {
    const dayLabel = getDueDayOnlyLabel(dueDate, 'Today')
    return startFormatted ? `${startFormatted} - ${dayLabel}` : `Due ${dayLabel}`
  }
  if (isDueTomorrow) {
    const dayLabel = getDueDayOnlyLabel(dueDate, 'Tomorrow')
    return startFormatted ? `${startFormatted} - ${dayLabel}` : `Due ${dayLabel}`
  }

  return startFormatted ? `${startFormatted} - ${dueFormatted}` : `Due ${dueFormatted}`
}
