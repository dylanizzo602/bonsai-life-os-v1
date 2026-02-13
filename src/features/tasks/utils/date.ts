/* Date helpers for task views (e.g. overdue detection) */

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
