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

/**
 * Format ISO date as "Jan 22" or "Jan 22 at 3:00pm" when time present.
 * Treats strings that only encode a midnight time (e.g. "2026-03-31T00:00:00+00:00")
 * as date-only so that clearing time or storing date-only values does not show
 * a phantom time from timezone conversion.
 */
function formatDateWithOptionalTime(isoString: string | null | undefined): string | null {
  if (isoString == null || isoString === '') return null

  // Detect explicit non-midnight time component directly from the string
  const timeMatch = isoString.match(/T(\d{2}):(\d{2})/)
  const hasExplicitTime =
    !!timeMatch && (timeMatch[1] !== '00' || timeMatch[2] !== '00')

  const isDateOnly = !isoString.includes('T') || !hasExplicitTime

  const d = isDateOnly
    ? (() => {
        // When a time component is present but effectively midnight, only use the
        // date portion (first 10 chars, YYYY-MM-DD) so that timezone offsets
        // do not create a phantom time.
        const datePart = isoString.includes('T') ? isoString.slice(0, 10) : isoString
        const [y, m, day] = datePart.split('-').map(Number)
        return new Date(y, (m ?? 1) - 1, day ?? 1)
      })()
    : new Date(isoString)

  if (isNaN(d.getTime())) return null

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
    const formatted = formatDateWithOptionalTime(startDate)
    if (!formatted) return null
    return isPastStartDate(startDate) ? `Started ${formatted}` : `Starts ${formatted}`
  }
  if (!hasStart && hasDue) {
    const formatted = formatDateWithOptionalTime(dueDate)
    return formatted ? `Due ${formatted}` : null
  }
  /* hasStart && hasDue */
  const dueFormatted = formatDateWithOptionalTime(dueDate)
  if (!dueFormatted) return null
  if (isPastStartDate(startDate)) return `Due ${dueFormatted}`
  const startFormatted = formatDateWithOptionalTime(startDate)
  return startFormatted ? `${startFormatted} - ${dueFormatted}` : `Due ${dueFormatted}`
}
