/* dismissedInAppNotifications: localStorage dismissals for task and briefing in-app rows */

import { getDayKeyInTimeZone } from './utils/notificationTime'

const TASK_DISMISS_STORAGE_KEY = 'bonsai-dismissed-in-app-task-notifications-v1'

/** Shared with home morning briefing banner — dismissing either hides both for the day. */
export const MORNING_BRIEFING_DISMISS_KEY_PREFIX = 'bonsai-dismissed-morning-briefing-'

/** Drop dismissed task keys older than this many days on load/save. */
const DISMISS_RETENTION_DAYS = 120

function addDaysYMD(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse trailing calendar day from overdue dismiss keys, or null when invalid. */
function dayKeyFromOverdueDismissKey(key: string): string | null {
  const match = key.match(/^task_overdue:[^:]+:(\d{4}-\d{2}-\d{2})$/)
  return match?.[1] ?? null
}

/** Remove stale overdue-day keys beyond the retention window. */
function pruneTaskDismissKeys(keys: Iterable<string>): string[] {
  const cutoff = addDaysYMD(getDayKeyInTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone), -DISMISS_RETENTION_DAYS)
  const kept: string[] = []
  for (const key of keys) {
    if (key.startsWith('task_due_soon:')) {
      kept.push(key)
      continue
    }
    const dayKey = dayKeyFromOverdueDismissKey(key)
    if (!dayKey || dayKey >= cutoff) {
      kept.push(key)
    }
  }
  return kept
}

/** Load dismissed in-app task notification row keys. */
export function loadDismissedTaskNotificationKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(TASK_DISMISS_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as { keys?: string[] }
    if (!Array.isArray(parsed?.keys)) return new Set()
    return new Set(pruneTaskDismissKeys(parsed.keys))
  } catch {
    return new Set()
  }
}

/** Persist dismissed in-app task notification row keys. */
export function saveDismissedTaskNotificationKeys(keys: Set<string>): void {
  try {
    localStorage.setItem(
      TASK_DISMISS_STORAGE_KEY,
      JSON.stringify({ keys: pruneTaskDismissKeys(keys) }),
    )
  } catch {
    // ignore quota errors
  }
}

/** Dismiss key for an overdue task on a specific local calendar day. */
export function taskOverdueDismissKey(taskId: string, dayKey: string): string {
  return `task_overdue:${taskId}:${dayKey}`
}

/** Dismiss key for a due-soon task (until due status changes). */
export function taskDueSoonDismissKey(taskId: string): string {
  return `task_due_soon:${taskId}`
}

/** Dismiss key for morning briefing in-app row (day-scoped, shared with home banner). */
export function morningBriefingDismissKey(dayKey: string): string {
  return `${MORNING_BRIEFING_DISMISS_KEY_PREFIX}${dayKey}`
}

/** Whether the user dismissed the morning briefing for today in the given zone. */
export function isMorningBriefingDismissedToday(timeZone: string): boolean {
  const dayKey = getDayKeyInTimeZone(timeZone)
  try {
    return localStorage.getItem(morningBriefingDismissKey(dayKey)) === '1'
  } catch {
    return false
  }
}

/** Mark today's morning briefing notification dismissed (shared with home banner). */
export function dismissMorningBriefingToday(timeZone: string): void {
  const dayKey = getDayKeyInTimeZone(timeZone)
  try {
    localStorage.setItem(morningBriefingDismissKey(dayKey), '1')
  } catch {
    // ignore
  }
}
