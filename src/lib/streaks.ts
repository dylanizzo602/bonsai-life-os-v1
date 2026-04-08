/* streaks: Shared StreakEntry type and weekday bitmask helper for habit calendars and streak math. */

/** One habit entry for streak computation (date + status) */
export interface StreakEntry {
  date: string
  status: 'completed' | 'skipped' | 'minimum'
}

/**
 * Whether the date falls on a selected weekday.
 * weekDayBitmask: bit 0 = Sunday … bit 6 = Saturday (values 1–127).
 */
export function isSelectedWeekday(ymd: string, weekDayBitmask: number): boolean {
  if (weekDayBitmask < 1 || weekDayBitmask > 127) return false
  const d = new Date(ymd + 'T12:00:00')
  const day = d.getDay()
  return (weekDayBitmask & (1 << day)) !== 0
}
