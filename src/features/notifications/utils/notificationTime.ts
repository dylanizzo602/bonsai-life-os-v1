/* notificationTime: Shared zoned time helpers for in-app and local push notification rules */

import { DateTime } from 'luxon'

/** Morning briefing push window: only notify in a short period after local noon. */
export const MORNING_BRIEFING_NOON_WINDOW_MS = 60 * 1000

/** Build a stable YYYY-MM-DD key in the active user time zone for per-day dedupe. */
export function getDayKeyInTimeZone(timeZone: string): string {
  return DateTime.now().setZone(timeZone).toFormat('yyyy-LL-dd')
}

/**
 * Push noon gate: only allow the briefing notification in the first minute after 12pm local time.
 */
export function isWithinMorningBriefingNoonWindow(timeZone: string): boolean {
  const nowZ = DateTime.now().setZone(timeZone)
  const noon = nowZ.set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
  const elapsedMs = nowZ.toMillis() - noon.toMillis()
  return elapsedMs >= 0 && elapsedMs <= MORNING_BRIEFING_NOON_WINDOW_MS
}

/** In-app bell: true when local wall time is at or past 12:00 on the current calendar day. */
export function isPastLocalNoon(timeZone: string): boolean {
  const nowZ = DateTime.now().setZone(timeZone)
  const noon = nowZ.set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
  return nowZ.toMillis() >= noon.toMillis()
}

/**
 * Resolve the best timezone for time-of-day gates like noon.
 * Prefer the app's effective user timezone; fall back to device when placeholder is 'local'.
 */
export function resolveNoonGateTimeZone(notificationTimeZone: string): string {
  if (notificationTimeZone && notificationTimeZone !== 'local') {
    return notificationTimeZone
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
