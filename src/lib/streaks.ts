/* Streaks: Compute current and longest habit streaks from entries.
 * Rules: Only completed days count. At most 1 consecutive skipped/incomplete day is allowed.
 * 2+ consecutive skipped or incomplete days in a row breaks the streak. */

export interface StreakEntry {
  date: string
  status: 'completed' | 'skipped'
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

/** Day is a gap (skipped or incomplete) if not completed */
function isGap(status: 'completed' | 'skipped' | undefined): boolean {
  return status !== 'completed'
}

/**
 * Compute current streak by walking backward from endDate.
 * Counts completed days; allows at most 1 consecutive gap. Stops when 2+ consecutive gaps.
 */
function countStreakBackward(
  map: Map<string, 'completed' | 'skipped'>,
  endDate: string
): { count: number; dates: string[] } {
  const dates: string[] = []
  let d = endDate
  let consecutiveGaps = 0
  while (true) {
    const status = map.get(d)
    if (status === 'completed') {
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
  const map = new Map<string, 'completed' | 'skipped'>()
  for (const e of entries) {
    map.set(e.date, e.status)
  }

  const yesterday = addDays(todayYMD, -1)
  const todayStatus = map.get(todayYMD)
  const yesterdayStatus = map.get(yesterday)

  /* Current streak end date: today if completed; yesterday if today is 1 gap and yesterday completed; else null */
  let endDate: string | null = null
  if (todayStatus === 'completed') {
    endDate = todayYMD
  } else if (isGap(todayStatus) && yesterdayStatus === 'completed') {
    /* 1 gap allowed: today skipped/incomplete, yesterday completed */
    endDate = yesterday
  }
  /* else: today and yesterday both gaps = 2 consecutive, streak broken */

  let currentStreak = 0
  if (endDate) {
    currentStreak = countStreakBackward(map, endDate).count
  }

  /* Longest streak: scan calendar days from min to max entry date, count runs with at most 1 consecutive gap */
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
    if (status === 'completed') {
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
  const map = new Map<string, 'completed' | 'skipped'>()
  for (const e of entries) {
    map.set(e.date, e.status)
  }
  const yesterday = addDays(todayYMD, -1)
  const todayStatus = map.get(todayYMD)
  const yesterdayStatus = map.get(yesterday)

  let endDate: string | null = null
  if (todayStatus === 'completed') {
    endDate = todayYMD
  } else if (isGap(todayStatus) && yesterdayStatus === 'completed') {
    endDate = yesterday
  }
  if (!endDate) return []

  return countStreakBackward(map, endDate).dates
}
