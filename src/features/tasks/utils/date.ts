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
 * Format ISO date as "Jan 22" or "Jan 22 at 3:00pm" when time present. Date-only (YYYY-MM-DD) parsed as local.
 */
function formatDateWithOptionalTime(isoString: string | null | undefined): string | null {
  if (isoString == null || isoString === '') return null
  const isDateOnly = !isoString.includes('T')
  const d = isDateOnly
    ? (() => {
        const [y, m, day] = isoString.split('-').map(Number)
        return new Date(y, (m ?? 1) - 1, day ?? 1)
      })()
    : new Date(isoString)
  if (isNaN(d.getTime())) return null
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (isDateOnly) return dateStr
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0
  if (hasTime) {
    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${dateStr} at ${timeStr}`
  }
  return dateStr
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
