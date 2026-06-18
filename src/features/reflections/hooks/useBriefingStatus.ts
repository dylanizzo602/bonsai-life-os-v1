/* useBriefingStatus hook: Morning/weekly briefing completion and streak state for Reflect landing cards */

import { useEffect, useState } from 'react'
import {
  getHasCompletedMorningBriefingToday,
  getHasCompletedWeeklyBriefingThisWeek,
  getMorningBriefingStreak,
  getWeeklyBriefingStreak,
  getTodaysMorningBriefingEntry,
} from '../../../lib/supabase/reflections'
import type { ReflectionEntry } from '../types'
import { useUserTimeZone } from '../../settings/useUserTimeZone'

/**
 * Fetches briefing completion status, streaks, and today's morning entry for briefing cards.
 */
export function useBriefingStatus() {
  const timeZone = useUserTimeZone()

  const [hasCompletedMorningToday, setHasCompletedMorningToday] = useState<boolean | null>(null)
  const [hasCompletedWeeklyThisWeek, setHasCompletedWeeklyThisWeek] = useState<boolean | null>(null)
  const [morningStreakDays, setMorningStreakDays] = useState<number | null>(null)
  const [weeklyStreakWeeks, setWeeklyStreakWeeks] = useState<number | null>(null)
  const [todaysMorningEntry, setTodaysMorningEntry] = useState<ReflectionEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        setLoading(true)
        const [morningDone, weeklyDone, morningStreak, weeklyStreak, todayEntry] = await Promise.all([
          getHasCompletedMorningBriefingToday(timeZone),
          getHasCompletedWeeklyBriefingThisWeek(),
          getMorningBriefingStreak(timeZone),
          getWeeklyBriefingStreak(timeZone),
          getTodaysMorningBriefingEntry(timeZone),
        ])

        if (!cancelled) {
          setHasCompletedMorningToday(morningDone)
          setHasCompletedWeeklyThisWeek(weeklyDone)
          setMorningStreakDays(morningStreak)
          setWeeklyStreakWeeks(weeklyStreak)
          setTodaysMorningEntry(todayEntry)
        }
      } catch {
        if (!cancelled) {
          setHasCompletedMorningToday(false)
          setHasCompletedWeeklyThisWeek(false)
          setMorningStreakDays(0)
          setWeeklyStreakWeeks(0)
          setTodaysMorningEntry(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [timeZone])

  return {
    hasCompletedMorningToday,
    hasCompletedWeeklyThisWeek,
    morningStreakDays,
    weeklyStreakWeeks,
    todaysMorningEntry,
    loading,
  }
}
