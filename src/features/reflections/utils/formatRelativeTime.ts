/* Relative time helpers for reflection editor metadata */

/**
 * Format a timestamp as a friendly "Last edited …" label.
 */
export function formatLastEditedLabel(timestampMs: number): string {
  const diffMs = Math.max(0, Date.now() - timestampMs)
  const mins = Math.floor(diffMs / 60_000)

  if (mins < 1) return 'Last edited just now'
  if (mins < 60) return `Last edited ${mins} min${mins === 1 ? '' : 's'} ago`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Last edited ${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `Last edited ${days} day${days === 1 ? '' : 's'} ago`

  const d = new Date(timestampMs)
  return `Last edited ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

/**
 * Format an ISO date as a long display label (e.g. "May 24, 2024").
 */
export function formatLongEntryDate(isoDate: string): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return 'Unknown date'
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/**
 * Convert an ISO timestamp to YYYY-MM-DD for date inputs.
 */
export function isoToDateInputValue(isoDate: string): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Convert a YYYY-MM-DD date input value to ISO, preserving midday local time.
 */
export function dateInputValueToIso(ymd: string): string {
  return new Date(`${ymd}T12:00:00`).toISOString()
}
