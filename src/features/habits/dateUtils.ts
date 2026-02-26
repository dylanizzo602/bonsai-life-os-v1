/* Date helpers for habit tables: YYYY-MM-DD ranges and header formatting */

/** Add n days to YYYY-MM-DD */
export function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** List of dates from start to end inclusive */
export function datesInRange(start: string, end: string): string[] {
  const out: string[] = []
  let d = start
  while (d <= end) {
    out.push(d)
    d = addDays(d, 1)
  }
  return out
}

/** Short month + day for date column header (e.g. "Feb" and "18") */
export function formatHeaderMonthDay(ymd: string): { month: string; day: string } {
  const d = new Date(ymd + 'T12:00:00')
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = String(d.getDate())
  return { month, day }
}
