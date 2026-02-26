/* Streaks 1.1: Weighted streaks. Green (completed)=1, yellow (minimum)=0.1, red (skipped/missing)=0 and ends streak. */

import type { StreakEntry } from './streaks'
import { isSelectedWeekday } from './streaks'

/** Add n days to YYYY-MM-DD */
function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Sunday (YYYY-MM-DD) that starts the week containing the given date */
function getWeekStart(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  const dayOfWeek = d.getDay()
  return addDays(ymd, -dayOfWeek)
}

export interface StreakResultV1 {
  currentStreak: number
  longestStreak: number
}

const WEIGHT_COMPLETED = 1
const WEIGHT_MINIMUM = 0.1

/** Get weight for day; red (skipped or missing) returns 0 and should end streak */
function getWeight(status: 'completed' | 'skipped' | 'minimum' | undefined): number {
  if (status === 'completed') return WEIGHT_COMPLETED
  if (status === 'minimum') return WEIGHT_MINIMUM
  return 0
}

/** Is day red (breaks streak)? */
function isRed(status: 'completed' | 'skipped' | 'minimum' | undefined): boolean {
  return getWeight(status) === 0
}

/**
 * Current and longest weighted streak (1.1). Green=1, yellow=0.1; red ends streak.
 * Missing date = red.
 */
export function getStreaksWeighted(
  entries: StreakEntry[],
  todayYMD: string
): StreakResultV1 {
  const map = new Map<string, 'completed' | 'skipped' | 'minimum'>()
  for (const e of entries) {
    map.set(e.date, e.status)
  }

  /* Current: from today backward, sum weights until first red day */
  let currentStreak = 0
  let d = todayYMD
  while (!isRed(map.get(d))) {
    currentStreak += getWeight(map.get(d))
    d = addDays(d, -1)
  }

  /* Longest: scan all dates in range, find runs separated by red, sum weights per run */
  const allDates = [...map.keys()]
  if (allDates.length === 0) return { currentStreak, longestStreak: currentStreak }

  const minDate = allDates.reduce((a, b) => (a < b ? a : b))
  const maxDate = allDates.reduce((a, b) => (a > b ? a : b))
  const end = maxDate > todayYMD ? maxDate : todayYMD

  let longestStreak = currentStreak
  let run = 0
  d = minDate
  while (d <= end) {
    if (isRed(map.get(d))) {
      if (run > longestStreak) longestStreak = run
      run = 0
    } else {
      run += getWeight(map.get(d))
      if (run > longestStreak) longestStreak = run
    }
    d = addDays(d, 1)
  }

  return { currentStreak, longestStreak }
}

/** Dates in current weighted streak (oldest first), for 1.1 cell shading */
export function getCurrentStreakDatesWeighted(
  entries: StreakEntry[],
  todayYMD: string
): string[] {
  const map = new Map<string, 'completed' | 'skipped' | 'minimum'>()
  for (const e of entries) {
    map.set(e.date, e.status)
  }
  const dates: string[] = []
  let d = todayYMD
  while (!isRed(map.get(d))) {
    dates.push(d)
    d = addDays(d, -1)
  }
  return dates.reverse()
}

/** Week weight = sum of day weights for selected days in that week; red on any selected day = week is red */
function getWeekWeight(
  weekStart: string,
  map: Map<string, 'completed' | 'skipped' | 'minimum'>,
  weekDayBitmask: number
): number {
  let sum = 0
  for (let i = 0; i < 7; i++) {
    if ((weekDayBitmask & (1 << i)) === 0) continue
    const date = addDays(weekStart, i)
    const status = map.get(date)
    if (isRed(status)) return 0
    sum += getWeight(status)
  }
  return sum
}

/**
 * Weighted streaks for weekly habits (1.1): streak = sum of week weights; red on any selected day in a week zeros that week and ends streak.
 */
export function getStreaksWeeklyWeighted(
  entries: StreakEntry[],
  todayYMD: string,
  weekDayBitmask: number
): StreakResultV1 {
  const map = new Map<string, 'completed' | 'skipped' | 'minimum'>()
  for (const e of entries) {
    map.set(e.date, e.status)
  }

  const weekStartToday = getWeekStart(todayYMD)
  let currentStreak = 0
  let w = weekStartToday
  let weekWeight = getWeekWeight(w, map, weekDayBitmask)
  if (weekWeight === 0) {
    w = addDays(w, -7)
    weekWeight = getWeekWeight(w, map, weekDayBitmask)
  }
  while (weekWeight > 0) {
    currentStreak += weekWeight
    w = addDays(w, -7)
    weekWeight = getWeekWeight(w, map, weekDayBitmask)
  }

  const allDates = [...map.keys()]
  if (allDates.length === 0) return { currentStreak, longestStreak: currentStreak }

  const weekStarts = new Set<string>()
  for (const date of allDates) {
    if (isSelectedWeekday(date, weekDayBitmask)) {
      weekStarts.add(getWeekStart(date))
    }
  }
  const sorted = [...weekStarts].sort()
  let longestStreak = currentStreak
  let run = 0
  for (const ws of sorted) {
    const ww = getWeekWeight(ws, map, weekDayBitmask)
    if (ww === 0) {
      if (run > longestStreak) longestStreak = run
      run = 0
    } else {
      run += ww
      if (run > longestStreak) longestStreak = run
    }
  }

  return { currentStreak, longestStreak }
}

/** Dates in current weekly weighted streak (selected days in streak weeks), oldest first */
export function getCurrentStreakDatesWeeklyWeighted(
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
  if (getWeekWeight(w, map, weekDayBitmask) === 0) {
    w = addDays(w, -7)
  }
  while (getWeekWeight(w, map, weekDayBitmask) > 0) {
    for (let i = 0; i < 7; i++) {
      if ((weekDayBitmask & (1 << i)) === 0) continue
      dates.push(addDays(w, i))
    }
    w = addDays(w, -7)
  }
  return dates.sort()
}
