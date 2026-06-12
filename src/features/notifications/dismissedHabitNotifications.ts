/* dismissedHabitNotifications: Per-occurrence dismissals for in-app habit notification rows */

import { habitNotificationDismissKey } from '../habits/utils/habitReminderRows'

export { habitNotificationDismissKey }

const STORAGE_KEY = 'bonsai-dismissed-habit-notifications-v2'
/** Drop dismissed keys older than this many days on load/save to keep storage bounded */
const DISMISS_RETENTION_DAYS = 120

function getTodayYMD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysYMD(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse occurrence date from a dismiss key, or null when invalid. */
function occurrenceDateFromDismissKey(key: string): string | null {
  const idx = key.lastIndexOf(':')
  if (idx <= 0) return null
  const date = key.slice(idx + 1)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
}

/** Remove dismiss keys for occurrences older than the retention window. */
function pruneDismissKeys(keys: Iterable<string>): string[] {
  const cutoff = addDaysYMD(getTodayYMD(), -DISMISS_RETENTION_DAYS)
  const kept: string[] = []
  for (const key of keys) {
    const occurrenceDate = occurrenceDateFromDismissKey(key)
    if (!occurrenceDate || occurrenceDate >= cutoff) {
      kept.push(key)
    }
  }
  return kept
}

/** Load dismissed habit occurrence keys (persists across days until pruned). */
export function loadDismissedHabitReminderKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as { keys?: string[] }
    if (!Array.isArray(parsed?.keys)) return new Set()
    return new Set(pruneDismissKeys(parsed.keys))
  } catch {
    return new Set()
  }
}

/** Persist dismissed habit occurrence keys. */
export function saveDismissedHabitReminderKeys(keys: Set<string>): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ keys: pruneDismissKeys(keys) }),
    )
  } catch {
    // ignore quota errors
  }
}

/** @deprecated Use loadDismissedHabitReminderKeys — kept for callers migrating off habit-id-only dismissals */
export function loadDismissedHabitIds(): Set<string> {
  return loadDismissedHabitReminderKeys()
}

/** @deprecated Use saveDismissedHabitReminderKeys */
export function saveDismissedHabitIds(ids: Set<string>): void {
  saveDismissedHabitReminderKeys(ids)
}
