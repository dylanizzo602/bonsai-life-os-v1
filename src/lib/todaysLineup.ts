/* Today's Lineup storage: date-scoped task IDs that reset daily; shared by Tasks and Briefing */

const TODAYS_LINEUP_STORAGE_KEY = 'bonsai-todays-lineup'

/** Current date as YYYY-MM-DD for comparison. */
export function getTodayYMD(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

/** Load task IDs for today from localStorage; returns empty set if stored date is not today. */
export function loadTodaysLineupTaskIds(): Set<string> {
  try {
    const raw = localStorage.getItem(TODAYS_LINEUP_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as { date?: string; taskIds?: string[] }
    const today = getTodayYMD()
    if (parsed?.date !== today || !Array.isArray(parsed.taskIds)) return new Set()
    return new Set(parsed.taskIds)
  } catch {
    return new Set()
  }
}

/** Persist Today's Lineup to localStorage with current date. */
export function saveTodaysLineupTaskIds(ids: Set<string>): void {
  try {
    localStorage.setItem(
      TODAYS_LINEUP_STORAGE_KEY,
      JSON.stringify({ date: getTodayYMD(), taskIds: Array.from(ids) }),
    )
  } catch {
    // ignore
  }
}
