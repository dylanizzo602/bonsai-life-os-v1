/* habitStreaks: Integer habit streaks — completed and minimum both count as “done”.
 * Daily: consecutive calendar days (today open → streak can end at yesterday).
 * Weekly: consecutive complete weeks (every selected weekday has completed|minimum).
 * Monthly: consecutive complete months (must log on the scheduled day-of-month; clamped for short months). */

import type { StreakEntry } from './streaks'

export interface HabitStreakResult {
  currentStreak: number
  longestStreak: number
}

/** Add n days to YYYY-MM-DD */
function addDays(ymd: string, n: number): string {
  /* Date math: use local noon to avoid DST edges; return local YYYY-MM-DD (not UTC slice). */
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Sunday (YYYY-MM-DD) starting the week that contains ymd */
function getWeekStart(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  return addDays(ymd, -d.getDay())
}

/** Add n months to a YYYY-MM-DD (uses local calendar; keeps day clamped by Date) */
function addMonths(ymd: string, n: number): string {
  /* Month math: use local noon and always return YYYY-MM-DD in local calendar. */
  const d = new Date(ymd + 'T12:00:00')
  d.setMonth(d.getMonth() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Scheduled day in a given month, clamped to month length; -1 means last day */
function monthDueYMDFor(
  monthAnchorYMD: string,
  monthlyDay: number,
): string {
  const d = new Date(monthAnchorYMD + 'T12:00:00')
  const y = d.getFullYear()
  const mo = d.getMonth()
  const last = new Date(y, mo + 1, 0).getDate()
  const day = monthlyDay === -1 ? last : Math.max(1, Math.min(31, Math.min(monthlyDay, last)))
  const ymd = `${y}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return ymd
}

/** List occurrence dates for a monthly schedule in an inclusive [from, to] range */
function monthlyOccurrencesInRange(
  fromYMD: string,
  toYMD: string,
  intervalMonths: number,
  monthlyDay: number,
): string[] {
  const interval = Math.max(1, Math.trunc(intervalMonths || 1))
  const day = monthlyDay === -1 ? -1 : Math.max(1, Math.min(31, Math.trunc(monthlyDay || 1)))

  /* Start search: first day of the from-month */
  const fromMonthStart = fromYMD.slice(0, 7) + '-01'
  let cursorMonthStart = fromMonthStart
  let due = monthDueYMDFor(cursorMonthStart, day)

  /* If due is before fromYMD, advance by interval until within range */
  while (due < fromYMD) {
    cursorMonthStart = addMonths(cursorMonthStart, interval)
    due = monthDueYMDFor(cursorMonthStart, day)
  }

  const out: string[] = []
  while (due <= toYMD) {
    out.push(due)
    cursorMonthStart = addMonths(cursorMonthStart, interval)
    due = monthDueYMDFor(cursorMonthStart, day)
  }
  return out
}

/** Target or minimum counts toward streak; skipped or missing does not */
function isDone(status: 'completed' | 'skipped' | 'minimum' | undefined): boolean {
  return status === 'completed' || status === 'minimum'
}

function toMap(entries: StreakEntry[]): Map<string, 'completed' | 'skipped' | 'minimum'> {
  /* Indexing: convert sparse entry list into a date->status map for fast lookups. */
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
  const minD = allDates.reduce((a, b) => (a < b ? a : b))
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
  /* Streak window: include selected weekdays within each fully-complete week of the current weekly streak. */
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

/**
 * Weekly progress dates (for counts): selected weekdays in the current week up to today that are already logged
 * as completed/minimum.
 *
 * This is intentionally separate from `getCurrentStreakDatesWeekly`, because weekly streak length is counted in
 * fully-complete weeks, but users expect Target/Min counts to update immediately per action as the current week
 * progresses.
 */
export function getCurrentWeekProgressDatesWeekly(
  entries: StreakEntry[],
  todayYMD: string,
  weekDayBitmask: number,
): string[] {
  /* Progress window: only include scheduled days in the current week that are <= today and done. */
  const map = toMap(entries)
  const weekStart = getWeekStart(todayYMD)
  const today = new Date(todayYMD + 'T12:00:00')
  const dates: string[] = []

  for (let i = 0; i < 7; i++) {
    if ((weekDayBitmask & (1 << i)) === 0) continue
    const date = addDays(weekStart, i)
    const d = new Date(date + 'T12:00:00')
    if (d.getTime() > today.getTime()) continue
    if (isDone(map.get(date))) dates.push(date)
  }

  return dates.sort()
}

/**
 * Monthly streaks: streak length is consecutive scheduled occurrences (months).
 * A month counts only if the entry on the scheduled due date is completed|mininum.
 *
 * Today behavior mirrors daily:
 * - If today is a due date and it's skipped → current streak is 0.
 * - If today is a due date and it's empty → anchor the streak at the previous due date.
 */
export function getStreaksMonthly(
  entries: StreakEntry[],
  todayYMD: string,
  monthlyInterval: number,
  monthlyDay: number,
): HabitStreakResult {
  const map = toMap(entries)
  const interval = Math.max(1, Math.trunc(monthlyInterval || 1))
  const day = monthlyDay === -1 ? -1 : Math.max(1, Math.min(31, Math.trunc(monthlyDay || 1)))

  const todayMonthStart = todayYMD.slice(0, 7) + '-01'
  const dueThisMonth = monthDueYMDFor(todayMonthStart, day)
  let anchorDue = dueThisMonth <= todayYMD ? dueThisMonth : monthDueYMDFor(addMonths(todayMonthStart, -interval), day)

  const todayStatus = map.get(dueThisMonth)
  if (dueThisMonth === todayYMD && todayStatus === 'skipped') {
    return { currentStreak: 0, longestStreak: longestStreakMonthly(map, todayYMD, interval, day) }
  }
  if (dueThisMonth === todayYMD && !isDone(todayStatus)) {
    anchorDue = monthDueYMDFor(addMonths(todayMonthStart, -interval), day)
  }

  let current = 0
  let d = anchorDue
  while (isDone(map.get(d))) {
    current++
    const prevMonthStart = addMonths(d.slice(0, 7) + '-01', -interval)
    d = monthDueYMDFor(prevMonthStart, day)
  }

  return { currentStreak: current, longestStreak: Math.max(longestStreakMonthly(map, todayYMD, interval, day), current) }
}

function longestStreakMonthly(
  map: Map<string, 'completed' | 'skipped' | 'minimum'>,
  todayYMD: string,
  intervalMonths: number,
  monthlyDay: number,
): number {
  const keys = [...map.keys()]
  if (keys.length === 0) return 0
  const minD = keys.reduce((a, b) => (a < b ? a : b))
  const maxD = [keys.reduce((a, b) => (a > b ? a : b)), todayYMD].reduce((a, b) => (a > b ? a : b))

  const occurrences = monthlyOccurrencesInRange(minD, maxD, intervalMonths, monthlyDay)
  let best = 0
  let run = 0
  for (const d of occurrences) {
    if (isDone(map.get(d))) {
      run++
      if (run > best) best = run
    } else {
      run = 0
    }
  }
  return best
}

/** Dates in the current monthly streak (scheduled due dates only), oldest first */
export function getCurrentStreakDatesMonthly(
  entries: StreakEntry[],
  todayYMD: string,
  monthlyInterval: number,
  monthlyDay: number,
): string[] {
  const map = toMap(entries)
  const interval = Math.max(1, Math.trunc(monthlyInterval || 1))
  const day = monthlyDay === -1 ? -1 : Math.max(1, Math.min(31, Math.trunc(monthlyDay || 1)))

  const todayMonthStart = todayYMD.slice(0, 7) + '-01'
  const dueThisMonth = monthDueYMDFor(todayMonthStart, day)

  const todayStatus = map.get(dueThisMonth)
  if (dueThisMonth === todayYMD && todayStatus === 'skipped') return []

  let anchorDue = dueThisMonth <= todayYMD ? dueThisMonth : monthDueYMDFor(addMonths(todayMonthStart, -interval), day)
  if (dueThisMonth === todayYMD && !isDone(todayStatus)) {
    anchorDue = monthDueYMDFor(addMonths(todayMonthStart, -interval), day)
  }

  const dates: string[] = []
  let d = anchorDue
  while (isDone(map.get(d))) {
    dates.push(d)
    const prevMonthStart = addMonths(d.slice(0, 7) + '-01', -interval)
    d = monthDueYMDFor(prevMonthStart, day)
  }
  return dates.sort()
}

/** Dispatch: weekly bitmask habits vs daily-style streak */
export function getHabitStreaks(
  entries: StreakEntry[],
  todayYMD: string,
  frequency: string,
  frequencyTarget: number | null,
  monthlyInterval?: number | null,
  monthlyDay?: number | null,
): HabitStreakResult {
  const weeklyMask = typeof frequencyTarget === 'number' ? frequencyTarget : 0
  const isWeekly = frequency === 'weekly' && weeklyMask >= 1 && weeklyMask <= 127
  if (isWeekly) {
    return getStreaksWeekly(entries, todayYMD, weeklyMask)
  }
  if (frequency === 'monthly') {
    return getStreaksMonthly(entries, todayYMD, monthlyInterval ?? 1, monthlyDay ?? 1)
  }
  return getStreaksDaily(entries, todayYMD)
}

export function getHabitCurrentStreakDates(
  entries: StreakEntry[],
  todayYMD: string,
  frequency: string,
  frequencyTarget: number | null,
  monthlyInterval?: number | null,
  monthlyDay?: number | null,
): string[] {
  /* Calendar shading: weekly uses only fully-complete weeks; daily uses consecutive done days. */
  const weeklyMask = typeof frequencyTarget === 'number' ? frequencyTarget : 0
  const isWeekly = frequency === 'weekly' && weeklyMask >= 1 && weeklyMask <= 127
  if (isWeekly) {
    return getCurrentStreakDatesWeekly(entries, todayYMD, weeklyMask)
  }
  if (frequency === 'monthly') {
    return getCurrentStreakDatesMonthly(entries, todayYMD, monthlyInterval ?? 1, monthlyDay ?? 1)
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
