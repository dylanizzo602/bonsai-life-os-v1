/* dismissedHabitNotifications: Date-scoped dismissals for in-app habit notification rows */

const STORAGE_KEY = 'bonsai-dismissed-habit-notifications'

function getTodayYMD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Load dismissed habit ids for today (resets when the calendar date changes). */
export function loadDismissedHabitIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as { date?: string; habitIds?: string[] }
    if (parsed?.date !== getTodayYMD() || !Array.isArray(parsed.habitIds)) {
      return new Set()
    }
    return new Set(parsed.habitIds)
  } catch {
    return new Set()
  }
}

/** Persist dismissed habit ids for today. */
export function saveDismissedHabitIds(ids: Set<string>): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: getTodayYMD(), habitIds: Array.from(ids) }),
    )
  } catch {
    // ignore quota errors
  }
}
