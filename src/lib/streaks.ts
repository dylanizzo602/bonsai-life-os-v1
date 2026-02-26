/* Streaks: Compute current and longest habit streaks from entries.
 * 1.0: Completed and minimum both count; at most 1 consecutive skipped/incomplete day allowed.
 * 1.2 strict: Only completed counts; any skip/minimum/missing breaks the streak. */

export interface StreakEntry {
  date: string
  status: 'completed' | 'skipped' | 'minimum'
}

export interface StreakResult {
  currentStreak: number
  longestStreak: number
}

/** Return YYYY-MM-DD for a Date (local date) */
function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Add n days to a YYYY-MM-DD string, return YYYY-MM-DD */
function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return toYMD(d)
}

/** Day counts as done for 1.0 streak (completed or minimum); gap = skipped or missing */
function isDoneForStreak(status: 'completed' | 'skipped' | 'minimum' | undefined): boolean {
  return status === 'completed' || status === 'minimum'
}

/** Day is a gap (skipped or no entry) for 1.0; minimum counts as done so not a gap */
function isGap(status: 'completed' | 'skipped' | 'minimum' | undefined): boolean {
  return !isDoneForStreak(status)
}

/**
 * Compute current streak by walking backward from endDate (1.0).
 * Counts completed and minimum days; allows at most 1 consecutive gap. Stops when 2+ consecutive gaps.
 */
function countStreakBackward(
  map: Map<string, 'completed' | 'skipped' | 'minimum'>,
  endDate: string
): { count: number; dates: string[] } {
  const dates: string[] = []
  let d = endDate
  let consecutiveGaps = 0
  while (true) {
    const status = map.get(d)
    if (isDoneForStreak(status)) {
      consecutiveGaps = 0
      dates.push(d)
      d = addDays(d, -1)
    } else {
      consecutiveGaps++
      if (consecutiveGaps >= 2) break
      d = addDays(d, -1)
    }
  }
  return { count: dates.length, dates: dates.reverse() }
}

/**
 * Compute current and longest streak from habit entries.
 * Rules: Only completed days count. You can skip 1 day and keep your streak; 2+ consecutive skipped/incomplete days breaks it.
 */
export function getStreaks(
  entries: StreakEntry[],
  todayYMD: string
): StreakResult {
  const map = new Map<string, 'completed' | 'skipped' | 'minimum'>()
  for (const e of entries) {
    map.set(e.date, e.status)
  }

  const yesterday = addDays(todayYMD, -1)
  const todayStatus = map.get(todayYMD)
  const yesterdayStatus = map.get(yesterday)

  /* Current streak end date: today if done (completed/minimum); yesterday if today is 1 gap and yesterday done; else null */
  let endDate: string | null = null
  if (isDoneForStreak(todayStatus)) {
    endDate = todayYMD
  } else if (isGap(todayStatus) && isDoneForStreak(yesterdayStatus)) {
    endDate = yesterday
  }

  let currentStreak = 0
  if (endDate) {
    currentStreak = countStreakBackward(map, endDate).count
  }

  /* Longest streak: count runs with at most 1 consecutive gap; completed and minimum both count */
  const allDates = [...map.keys()]
  if (allDates.length === 0) return { currentStreak, longestStreak: 0 }

  const minDate = allDates.reduce((a, b) => (a < b ? a : b))
  const maxDate = allDates.reduce((a, b) => (a > b ? a : b))
  const end = maxDate > todayYMD ? maxDate : todayYMD

  let longestStreak = 0
  let run = 0
  let consecutiveGaps = 0
  let d = minDate
  while (d <= end) {
    const status = map.get(d)
    if (isDoneForStreak(status)) {
      run++
      consecutiveGaps = 0
    } else {
      consecutiveGaps++
      if (consecutiveGaps >= 2) {
        if (run > longestStreak) longestStreak = run
        run = 0
        consecutiveGaps = 1
      }
    }
    d = addDays(d, 1)
  }
  if (run > longestStreak) longestStreak = run

  return { currentStreak, longestStreak }
}

/**
 * Return the list of dates (YYYY-MM-DD) that form the current streak, oldest first.
 * Used for cell shading: index in this list = streak age (0 = lightest, length-1 = darkest).
 * Only includes completed days; allows at most 1 consecutive skip/incomplete between completed days.
 */
export function getCurrentStreakDates(entries: StreakEntry[], todayYMD: string): string[] {
  const map = new Map<string, 'completed' | 'skipped' | 'minimum'>()
  for (const e of entries) {
    map.set(e.date, e.status)
  }
  const yesterday = addDays(todayYMD, -1)
  const todayStatus = map.get(todayYMD)
  const yesterdayStatus = map.get(yesterday)

  let endDate: string | null = null
  if (isDoneForStreak(todayStatus)) {
    endDate = todayYMD
  } else if (isGap(todayStatus) && isDoneForStreak(yesterdayStatus)) {
    endDate = yesterday
  }
  if (!endDate) return []

  return countStreakBackward(map, endDate).dates
}

/* --- Weekly habits: streak = consecutive weeks where all selected days are completed. No skip. --- */

/** Sunday (YYYY-MM-DD) that starts the week containing the given date (0=Sun .. 6=Sat) */
function getWeekStart(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  const dayOfWeek = d.getDay()
  return addDays(ymd, -dayOfWeek)
}

/** Whether the given date falls on a selected weekday; weekDayBitmask: bit 0=Sun .. bit 6=Sat */
export function isSelectedWeekday(ymd: string, weekDayBitmask: number): boolean {
  if (weekDayBitmask < 1 || weekDayBitmask > 127) return false
  const d = new Date(ymd + 'T12:00:00')
  const day = d.getDay()
  return (weekDayBitmask & (1 << day)) !== 0
}

/** Week is complete for 1.0 if every selected weekday has completed or minimum */
function isWeekComplete(
  weekStart: string,
  map: Map<string, 'completed' | 'skipped' | 'minimum'>,
  weekDayBitmask: number
): boolean {
  for (let i = 0; i < 7; i++) {
    if ((weekDayBitmask & (1 << i)) === 0) continue
    const date = addDays(weekStart, i)
    if (!isDoneForStreak(map.get(date))) return false
  }
  return true
}

/**
 * Streaks for weekly habits: count consecutive weeks where all selected days are completed.
 * weekDayBitmask: 1=Sun, 2=Mon, ..., 64=Sat (e.g. Mon+Wed = 2|4 = 6).
 */
export function getStreaksWeekly(
  entries: StreakEntry[],
  todayYMD: string,
  weekDayBitmask: number
): StreakResult {
  const map = new Map<string, 'completed' | 'skipped' | 'minimum'>()
  for (const e of entries) {
    map.set(e.date, e.status)
  }
  const weekStartToday = getWeekStart(todayYMD)

  /* Current streak: consecutive complete weeks ending at the most recent complete week.
   * If this week is complete, count from this week backward; if not, count from last week backward
   * so we still show e.g. 1 when last week was complete but this week isn't done yet. */
  let currentStreak = 0
  let w = weekStartToday
  if (!isWeekComplete(w, map, weekDayBitmask)) {
    w = addDays(w, -7)
  }
  while (isWeekComplete(w, map, weekDayBitmask)) {
    currentStreak++
    w = addDays(w, -7)
  }

  /* Longest streak: scan all weeks that have any entry, find max consecutive complete weeks */
  const allDates = [...map.keys()]
  if (allDates.length === 0) return { currentStreak, longestStreak: 0 }

  const weekStarts = new Set<string>()
  for (const date of allDates) {
    weekStarts.add(getWeekStart(date))
  }
  const sorted = [...weekStarts].sort()
  let longestStreak = 0
  let run = 0
  for (const ws of sorted) {
    if (isWeekComplete(ws, map, weekDayBitmask)) {
      run++
      if (run > longestStreak) longestStreak = run
    } else {
      run = 0
    }
  }

  return { currentStreak, longestStreak }
}

/**
 * Dates that form the current weekly streak (completed selected days in current streak weeks), oldest first.
 * Used for cell shading in the table.
 */
export function getCurrentStreakDatesWeekly(
  entries: StreakEntry[],
  todayYMD: string,
  weekDayBitmask: number
): string[] {
  const map = new Map<string, 'completed' | 'skipped' | 'minimum'>()
  for (const e of entries) {
    map.set(e.date, e.status)
  }
  const weekStartToday = getWeekStart(todayYMD)
  const dates: string[] = []
  let w = weekStartToday
  if (!isWeekComplete(w, map, weekDayBitmask)) {
    w = addDays(w, -7)
  }
  while (isWeekComplete(w, map, weekDayBitmask)) {
    for (let i = 0; i < 7; i++) {
      if ((weekDayBitmask & (1 << i)) === 0) continue
      const date = addDays(w, i)
      if (isDoneForStreak(map.get(date))) dates.push(date)
    }
    w = addDays(w, -7)
  }
  return dates.sort()
}

/* --- 1.2 Strict: only completed counts; any skip/minimum/missing breaks the streak --- */

/**
 * Strict streak (1.2): count consecutive days backward from today where every day is completed.
 * Minimum, skipped, or missing breaks the streak.
 */
export function getStreaksStrict(
  entries: StreakEntry[],
  todayYMD: string
): StreakResult {
  const map = new Map<string, 'completed' | 'skipped' | 'minimum'>()
  for (const e of entries) {
    map.set(e.date, e.status)
  }

  /* Current: walk backward while status === 'completed' only */
  let currentStreak = 0
  let d = todayYMD
  while (map.get(d) === 'completed') {
    currentStreak++
    d = addDays(d, -1)
  }

  /* Longest: scan all dates, find max run of consecutive completed days */
  const allDates = [...map.keys()]
  if (allDates.length === 0) return { currentStreak, longestStreak: Math.max(currentStreak, 0) }

  const minDate = allDates.reduce((a, b) => (a < b ? a : b))
  const maxDate = allDates.reduce((a, b) => (a > b ? a : b))
  const end = maxDate > todayYMD ? maxDate : todayYMD

  let longestStreak = currentStreak
  let run = 0
  d = minDate
  while (d <= end) {
    if (map.get(d) === 'completed') {
      run++
      if (run > longestStreak) longestStreak = run
    } else {
      run = 0
    }
    d = addDays(d, 1)
  }

  return { currentStreak, longestStreak }
}

/**
 * Strict weekly (1.2): consecutive weeks where all selected days are completed (no minimum/skip).
 */
export function getStreaksWeeklyStrict(
  entries: StreakEntry[],
  todayYMD: string,
  weekDayBitmask: number
): StreakResult {
  const map = new Map<string, 'completed' | 'skipped' | 'minimum'>()
  for (const e of entries) {
    map.set(e.date, e.status)
  }

  function isWeekCompleteStrict(weekStart: string): boolean {
    for (let i = 0; i < 7; i++) {
      if ((weekDayBitmask & (1 << i)) === 0) continue
      const date = addDays(weekStart, i)
      if (map.get(date) !== 'completed') return false
    }
    return true
  }

  const weekStartToday = getWeekStart(todayYMD)
  let currentStreak = 0
  let w = weekStartToday
  if (!isWeekCompleteStrict(w)) {
    w = addDays(w, -7)
  }
  while (isWeekCompleteStrict(w)) {
    currentStreak++
    w = addDays(w, -7)
  }

  const allDates = [...map.keys()]
  if (allDates.length === 0) return { currentStreak, longestStreak: currentStreak }

  const weekStarts = new Set<string>()
  for (const date of allDates) {
    weekStarts.add(getWeekStart(date))
  }
  const sorted = [...weekStarts].sort()
  let longestStreak = currentStreak
  let run = 0
  for (const ws of sorted) {
    if (isWeekCompleteStrict(ws)) {
      run++
      if (run > longestStreak) longestStreak = run
    } else {
      run = 0
    }
  }

  return { currentStreak, longestStreak }
}
