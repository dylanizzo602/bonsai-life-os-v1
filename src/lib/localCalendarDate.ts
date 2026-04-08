/* Local calendar YYYY-MM-DD from ISO timestamps — must match habit todo advance logic (browser local, not UTC prefix). */

/**
 * Map an ISO instant (or plain YYYY-MM-DD) to the calendar date in the browser's local timezone.
 * Used for habit entries and reminder "due on" checks; do not use iso.slice(0, 10) — that is UTC for timed values.
 */
export function isoInstantToLocalCalendarYMD(iso: string | null | undefined): string | null {
  if (iso == null || iso === '') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
