/* habitReminders: Convert between primary time + offsets and display reminder rows */

/** Parse "HH:mm" or "HH:mm:ss" to minutes since midnight */
export function timeStringToMinutes(hhmmss: string): number {
  const parts = hhmmss.split(':')
  const h = parseInt(parts[0] ?? '', 10)
  const m = parseInt(parts[1] ?? '0', 10)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

/** Format minutes since midnight to "HH:mm" for storage */
export function minutesToTimeString(mins: number): string {
  const normalized = ((mins % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(normalized / 60)
  const m = normalized % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Format "HH:mm" to "h:mm AM/PM" for display */
export function formatReminderTimeDisplay(hhmmss: string): string {
  const mins = timeStringToMinutes(hhmmss)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

/** Build absolute reminder times from primary + minute offsets */
export function buildReminderTimeList(
  primaryTime: string | null,
  offsetsMins: number[] | null | undefined,
): string[] {
  if (!primaryTime) return []
  const primaryMins = timeStringToMinutes(primaryTime)
  const times = [primaryTime]
  for (const offset of offsetsMins ?? []) {
    if (typeof offset !== 'number' || !Number.isFinite(offset) || offset === 0) continue
    times.push(minutesToTimeString(primaryMins + offset))
  }
  return times
}

/** Derive primary time and offsets from a list of absolute HH:mm times (first = primary) */
export function reminderTimesToStorage(times: string[]): {
  reminder_time: string | null
  additional_reminder_offsets_mins: number[]
} {
  if (times.length === 0) {
    return { reminder_time: null, additional_reminder_offsets_mins: [] }
  }
  const primary = times[0]
  const primaryMins = timeStringToMinutes(primary)
  const offsets = times
    .slice(1)
    .map((t) => timeStringToMinutes(t) - primaryMins)
    .filter((o) => o !== 0)
  return {
    reminder_time: primary,
    additional_reminder_offsets_mins: Array.from(new Set(offsets)).sort((a, b) => a - b),
  }
}
