/* habitStreaks: Integer habit streaks — completed and minimum both count as “done”.
 * Daily: consecutive calendar days (today open → streak can end at yesterday).
 * Weekly: consecutive complete weeks (every selected weekday has completed|minimum). */

import type { StreakEntry } from './streaks'

export interface HabitStreakResult {
  currentStreak: number
  longestStreak: number
}

/** Add n days to YYYY-MM-DD */
function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Sunday (YYYY-MM-DD) starting the week that contains ymd */
function getWeekStart(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  return addDays(ymd, -d.getDay())
}

/** Target or minimum counts toward streak; skipped or missing does not */
function isDone(status: 'completed' | 'skipped' | 'minimum' | undefined): boolean {
  return status === 'completed' || status === 'minimum'
}

function toMap(entries: StreakEntry[]): Map<string, 'completed' | 'skipped' | 'minimum'> {
  const map = new Map<string, 'completed' | 'skipped' | 'minimum'>()
  for (const e of entries) map.set(e.date, e.status)
  return map
}

/**
 * Current streak (days): walk backward from anchor; count consecutive days with completed|minimum.
 * If today is skipped → 0. If today is empty → anchor yesterday so morning shows streak through yesterday.
 */
export function getStreaksDaily(entries: StreakEntry[], todayYMD: string): HabitStreakResult {
  const map = toMap(entries)
  const todayS = map.get(todayYMD)
  if (todayS === 'skipped') {
    return { currentStreak: 0, longestStreak: longestStreakDaily(map, todayYMD) }
  }
  let anchor = todayYMD
  if (!isDone(todayS)) {
    anchor = addDays(todayYMD, -1)
  }
  let current = 0
  let d = anchor
  while (isDone(map.get(d))) {
    current++
    d = addDays(d, -1)
  }
  return { currentStreak: current, longestStreak: longestStreakDaily(map, todayYMD) }
}

/** Longest run of consecutive calendar days where each day is done (scan min..max date span) */
function longestStreakDaily(
  map: Map<string, 'completed' | 'skipped' | 'minimum'>,
  todayYMD: string,
): number {
  const keys = [...map.keys()]
  if (keys.length === 0) return 0
  let minD = keys.reduce((a, b) => (a < b ? a : b))
  const maxD = [keys.reduce((a, b) => (a > b ? a : b)), todayYMD].reduce((a, b) => (a > b ? a : b))
  if (minD > maxD) minD = todayYMD
  let best = 0
  let run = 0
  let d = minD
  while (d <= maxD) {
    if (isDone(map.get(d))) {
      run++
      if (run > best) best = run
    } else {
      run = 0
    }
    d = addDays(d, 1)
  }
  return best
}

/** Dates in the current daily streak (oldest first), for calendar shading */
export function getCurrentStreakDatesDaily(entries: StreakEntry[], todayYMD: string): string[] {
  const map = toMap(entries)
  const todayS = map.get(todayYMD)
  if (todayS === 'skipped') return []
  let anchor = todayYMD
  if (!isDone(todayS)) {
    anchor = addDays(todayYMD, -1)
  }
  const dates: string[] = []
  let d = anchor
  while (isDone(map.get(d))) {
    dates.push(d)
    d = addDays(d, -1)
  }
  return dates.sort()
}

/** Every selected weekday in the week has completed or minimum */
function isWeekComplete(
  weekStart: string,
  map: Map<string, 'completed' | 'skipped' | 'minimum'>,
  weekDayBitmask: number,
): boolean {
  for (let i = 0; i < 7; i++) {
    if ((weekDayBitmask & (1 << i)) === 0) continue
    const date = addDays(weekStart, i)
    if (!isDone(map.get(date))) return false
  }
  return true
}

/**
 * Current = consecutive complete weeks ending at the week containing today (or prior complete week).
 * Longest = max consecutive complete weeks in calendar order by week start.
 */
export function getStreaksWeekly(
  entries: StreakEntry[],
  todayYMD: string,
  weekDayBitmask: number,
): HabitStreakResult {
  const map = toMap(entries)
  const weekStartToday = getWeekStart(todayYMD)
  let w = weekStartToday
  if (!isWeekComplete(w, map, weekDayBitmask)) {
    w = addDays(w, -7)
  }
  let current = 0
  while (isWeekComplete(w, map, weekDayBitmask)) {
    current++
    w = addDays(w, -7)
  }

  const allDates = [...map.keys()]
  if (allDates.length === 0) {
    return { currentStreak: current, longestStreak: current }
  }
  let minD = allDates.reduce((a, b) => (a < b ? a : b))
  const maxD = [allDates.reduce((a, b) => (a > b ? a : b)), todayYMD].reduce((a, b) =>
    a > b ? a : b,
  )
  let ws = getWeekStart(minD)
  const endWs = getWeekStart(maxD)
  let longest = 0
  let run = 0
  while (ws <= endWs) {
    if (isWeekComplete(ws, map, weekDayBitmask)) {
      run++
      if (run > longest) longest = run
    } else {
      run = 0
    }
    ws = addDays(ws, 7)
  }
  return { currentStreak: current, longestStreak: Math.max(longest, current) }
}

/** Selected dates in the streak weeks (current weekly streak), oldest first */
export function getCurrentStreakDatesWeekly(
  entries: StreakEntry[],
  todayYMD: string,
  weekDayBitmask: number,
): string[] {
  const map = toMap(entries)
  let w = getWeekStart(todayYMD)
  if (!isWeekComplete(w, map, weekDayBitmask)) {
    w = addDays(w, -7)
  }
  const dates: string[] = []
  while (isWeekComplete(w, map, weekDayBitmask)) {
    for (let i = 0; i < 7; i++) {
      if ((weekDayBitmask & (1 << i)) === 0) continue
      dates.push(addDays(w, i))
    }
    w = addDays(w, -7)
  }
  return dates.sort()
}

/** Dispatch: weekly bitmask habits vs daily-style streak */
export function getHabitStreaks(
  entries: StreakEntry[],
  todayYMD: string,
  frequency: string,
  frequencyTarget: number | null,
): HabitStreakResult {
  const weeklyMask = typeof frequencyTarget === 'number' ? frequencyTarget : 0
  const isWeekly = frequency === 'weekly' && weeklyMask >= 1 && weeklyMask <= 127
  if (isWeekly) {
    return getStreaksWeekly(entries, todayYMD, weeklyMask)
  }
  return getStreaksDaily(entries, todayYMD)
}

export function getHabitCurrentStreakDates(
  entries: StreakEntry[],
  todayYMD: string,
  frequency: string,
  frequencyTarget: number | null,
): string[] {
  const weeklyMask = typeof frequencyTarget === 'number' ? frequencyTarget : 0
  const isWeekly = frequency === 'weekly' && weeklyMask >= 1 && weeklyMask <= 127
  if (isWeekly) {
    return getCurrentStreakDatesWeekly(entries, todayYMD, weeklyMask)
  }
  return getCurrentStreakDatesDaily(entries, todayYMD)
}

/**
 * Within the current streak window (same dates as calendar shading): how many days were logged as
 * target (completed) vs minimum. Skipped days are not in streakDateList.
 */
export function countTargetVsMinimumInCurrentStreak(
  entries: StreakEntry[],
  streakDateList: string[],
): { targetCount: number; minimumCount: number } {
  const map = toMap(entries)
  let targetCount = 0
  let minimumCount = 0
  for (const date of streakDateList) {
    const s = map.get(date)
    if (s === 'completed') targetCount++
    else if (s === 'minimum') minimumCount++
  }
  return { targetCount, minimumCount }
}
