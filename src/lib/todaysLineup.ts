/* Today's Lineup storage: date-scoped task IDs that reset daily; shared by Tasks and Briefing */

const TODAYS_LINEUP_STORAGE_KEY = 'bonsai-todays-lineup'

/** Current date as YYYY-MM-DD for comparison. */
export function getTodayYMD(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

type TodaysLineupStorage = {
  date?: string
  taskIds?: string[]
  /** Auto-lineup tasks the user removed for today (date-scoped) */
  excludedTaskIds?: string[]
}

function readTodaysLineupStorage(): TodaysLineupStorage | null {
  try {
    const raw = localStorage.getItem(TODAYS_LINEUP_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TodaysLineupStorage
    if (parsed?.date !== getTodayYMD()) return null
    return parsed
  } catch {
    return null
  }
}

/** Load task IDs for today from localStorage; returns empty set if stored date is not today. */
export function loadTodaysLineupTaskIds(): Set<string> {
  const parsed = readTodaysLineupStorage()
  if (!parsed || !Array.isArray(parsed.taskIds)) return new Set()
  return new Set(parsed.taskIds)
}

/** Load auto-lineup exclusions for today (tasks removed from Today's Lineup). */
export function loadLineupExcludedTaskIds(): Set<string> {
  const parsed = readTodaysLineupStorage()
  if (!parsed || !Array.isArray(parsed.excludedTaskIds)) return new Set()
  return new Set(parsed.excludedTaskIds)
}

/** Load today's lineup task IDs in display order (array). Returns empty array if stored date is not today. */
export function getTodaysLineupOrderedIds(): string[] {
  const parsed = readTodaysLineupStorage()
  if (!parsed || !Array.isArray(parsed.taskIds)) return []
  return parsed.taskIds
}

/** Persist Today's Lineup picks and exclusions to localStorage with current date. */
export function saveTodaysLineupState(
  taskIds: Set<string>,
  excludedTaskIds: Set<string> = loadLineupExcludedTaskIds(),
): void {
  try {
    localStorage.setItem(
      TODAYS_LINEUP_STORAGE_KEY,
      JSON.stringify({
        date: getTodayYMD(),
        taskIds: Array.from(taskIds),
        excludedTaskIds: Array.from(excludedTaskIds),
      }),
    )
  } catch {
    // ignore
  }
}

/** Persist Today's Lineup task picks (preserves exclusions). */
export function saveTodaysLineupTaskIds(ids: Set<string>): void {
  saveTodaysLineupState(ids, loadLineupExcludedTaskIds())
}
