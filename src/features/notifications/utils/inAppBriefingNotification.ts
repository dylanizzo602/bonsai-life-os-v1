/* inAppBriefingNotification: Morning briefing incomplete row for the notification bell */

import { getDayKeyInTimeZone, isPastLocalNoon, resolveNoonGateTimeZone } from './notificationTime'

export type InAppMorningBriefingRow = {
  kind: 'morning_briefing'
  rowKey: string
  dayKey: string
}

export function morningBriefingNotificationRowKey(dayKey: string): string {
  return `morning_briefing:${dayKey}`
}

/**
 * Build a single morning briefing notification row when local time is past noon,
 * today's briefing is incomplete, and the user has not dismissed it for today.
 */
export function buildMorningBriefingNotificationRow(params: {
  timeZone: string
  completedToday: boolean | null
  dismissedToday: boolean
}): InAppMorningBriefingRow | null {
  const { timeZone, completedToday, dismissedToday } = params

  if (completedToday !== false) return null
  if (dismissedToday) return null

  const noonTz = resolveNoonGateTimeZone(timeZone)
  if (!isPastLocalNoon(noonTz)) return null

  const dayKey = getDayKeyInTimeZone(noonTz)
  return {
    kind: 'morning_briefing',
    rowKey: morningBriefingNotificationRowKey(dayKey),
    dayKey,
  }
}
