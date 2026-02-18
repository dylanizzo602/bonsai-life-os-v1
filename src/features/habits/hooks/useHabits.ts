/* useHabits hook: Habit list, entries, view range, CRUD, setEntry cycle, and streak derivation */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  setEntry as setEntryApi,
  getEntriesForHabits,
} from '../../../lib/supabase/habits'
import {
  getStreaks,
  getCurrentStreakDates,
  getStreaksWeekly,
  getCurrentStreakDatesWeekly,
} from '../../../lib/streaks'
import type {
  Habit,
  HabitEntry,
  HabitWithStreaks,
  CreateHabitInput,
  UpdateHabitInput,
} from '../types'

/** Default date range: today for YYYY-MM-DD */
function todayYMD(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Add n days to YYYY-MM-DD */
function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export interface DateRange {
  start: string
  end: string
}

/** Get desktop week containing the given date (week start = Sunday) */
function weekRangeForDate(ymd: string): DateRange {
  const d = new Date(ymd + 'T12:00:00')
  const day = d.getDay()
  const start = addDays(ymd, -day)
  const end = addDays(start, 6)
  return { start, end }
}

/** Get next 3 days: today + next 2 (for tablet/mobile) */
function nextThreeDaysRange(): DateRange {
  const start = todayYMD()
  const end = addDays(start, 2)
  return { start, end }
}

/** Cycle for daily: empty -> completed -> skipped -> empty */
function getNextStatus(current: 'completed' | 'skipped' | null): 'completed' | 'skipped' | null {
  if (current === null || current === undefined) return 'completed'
  if (current === 'completed') return 'skipped'
  return null
}

/**
 * Custom hook for habits: list, CRUD, entry cycle (complete/skip/open), and streak derivation.
 * Exposes dateRange for the visible calendar; parent can set it (desktop week vs 3 days).
 */
export function useHabits(initialDateRange?: DateRange) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>(
    () => initialDateRange ?? weekRangeForDate(todayYMD())
  )

  /* Fetch habits and entries (wide range for streak calc, then filter to dateRange for table) */
  const fetchHabitsAndEntries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const habitsList = await getHabits()
      const ids = habitsList.map((h) => h.id)
      const wideStart = addDays(todayYMD(), -730)
      const wideEnd = addDays(todayYMD(), 7)
      const entriesWide =
        ids.length > 0
          ? await getEntriesForHabits(ids, wideStart, wideEnd)
          : {}
      setHabits(habitsList)
      setEntriesByHabit(entriesWide)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch habits')
      console.error('Error fetching habits:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const [entriesByHabit, setEntriesByHabit] = useState<Record<string, HabitEntry[]>>({})
  const entriesByHabitRef = useRef(entriesByHabit)
  entriesByHabitRef.current = entriesByHabit
  const habitsRef = useRef(habits)
  habitsRef.current = habits

  /* Initial fetch */
  useEffect(() => {
    fetchHabitsAndEntries()
  }, [fetchHabitsAndEntries])

  /* When date range changes (e.g. week navigation), fetch that range and merge into entries (keep streak history) */
  useEffect(() => {
    if (habits.length === 0) return
    const ids = habits.map((h) => h.id)
    getEntriesForHabits(ids, dateRange.start, dateRange.end)
      .then((byHabit) => {
        setEntriesByHabit((prev) => {
          const merged = { ...prev }
          for (const id of ids) {
            const existing = prev[id] ?? []
            const inRange = byHabit[id] ?? []
            const byDate = new Map(existing.map((e) => [e.entry_date, e]))
            inRange.forEach((e) => byDate.set(e.entry_date, e))
            merged[id] = [...byDate.values()].sort((a, b) =>
              a.entry_date.localeCompare(b.entry_date)
            )
          }
          return merged
        })
      })
      .catch((err) => {
        console.error('Error fetching entries for range:', err)
      })
  }, [dateRange.start, dateRange.end, habits.length])

  const today = todayYMD()

  /* Derive habits with current/longest streak and streak dates; weekly habits use week-based streak and selected days only */
  const habitsWithStreaks = useMemo((): HabitWithStreaks[] => {
    return habits.map((habit) => {
      const entries = entriesByHabit[habit.id] ?? []
      const streakEntries = entries.map((e) => ({ date: e.entry_date, status: e.status }))
      const isWeekly =
        habit.frequency === 'weekly' &&
        typeof habit.frequency_target === 'number' &&
        habit.frequency_target >= 1 &&
        habit.frequency_target <= 127
      const mask = isWeekly ? habit.frequency_target : 0
      const { currentStreak, longestStreak } = isWeekly
        ? getStreaksWeekly(streakEntries, today, mask)
        : getStreaks(streakEntries, today)
      const currentStreakDates = isWeekly
        ? getCurrentStreakDatesWeekly(streakEntries, today, mask)
        : getCurrentStreakDates(streakEntries, today)
      return {
        ...habit,
        currentStreak,
        longestStreak,
        currentStreakDates,
      }
    })
  }, [habits, entriesByHabit, today])

  /* Entries in visible range only (for table cells) */
  const entriesInRange = useMemo((): Record<string, HabitEntry[]> => {
    const out: Record<string, HabitEntry[]> = {}
    for (const [habitId, entries] of Object.entries(entriesByHabit)) {
      out[habitId] = entries.filter(
        (e) => e.entry_date >= dateRange.start && e.entry_date <= dateRange.end
      )
    }
    return out
  }, [entriesByHabit, dateRange])

  const createHabitHandler = useCallback(
    async (input: CreateHabitInput) => {
      try {
        setError(null)
        const newHabit = await createHabit(input)
        setHabits((prev) => [...prev, newHabit].sort((a, b) => a.sort_order - b.sort_order))
        const ids = [newHabit.id]
        const wideStart = addDays(todayYMD(), -730)
        const wideEnd = addDays(todayYMD(), 7)
        const byHabit = await getEntriesForHabits(ids, wideStart, wideEnd)
        setEntriesByHabit((prev) => ({ ...prev, [newHabit.id]: byHabit[newHabit.id] ?? [] }))
        return newHabit
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create habit'
        setError(msg)
        throw err
      }
    },
    []
  )

  const updateHabitHandler = useCallback(async (id: string, input: UpdateHabitInput) => {
    try {
      setError(null)
      const updated = await updateHabit(id, input)
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? updated : h)).sort((a, b) => a.sort_order - b.sort_order)
      )
      return updated
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update habit'
      setError(msg)
      throw err
    }
  }, [])

  const deleteHabitHandler = useCallback(async (id: string) => {
    try {
      setError(null)
      await deleteHabit(id)
      setHabits((prev) => prev.filter((h) => h.id !== id))
      setEntriesByHabit((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete habit'
      setError(msg)
      throw err
    }
  }, [])

  /* Cycle cell: complete -> skipped -> open for both daily and weekly (weekly streak still requires no skip on selected days). */
  const cycleEntry = useCallback(async (habitId: string, entryDate: string) => {
    const entries = entriesByHabitRef.current[habitId] ?? []
    const e = entries.find((x) => x.entry_date === entryDate)
    const currentStatus: 'completed' | 'skipped' | null = e ? e.status : null
    const next = getNextStatus(currentStatus)
    setError(null)
    setEntriesByHabit((prev) => {
      const ents = prev[habitId] ?? []
      const withoutDate = ents.filter((x) => x.entry_date !== entryDate)
      if (next === null) {
        return { ...prev, [habitId]: withoutDate }
      }
      const existing = ents.find((x) => x.entry_date === entryDate)
      const newEntry: HabitEntry = {
        id: existing?.id ?? '',
        habit_id: habitId,
        entry_date: entryDate,
        status: next,
        created_at: existing?.created_at ?? new Date().toISOString(),
      }
      const merged = withoutDate.concat(newEntry).sort((a, b) => a.entry_date.localeCompare(b.entry_date))
      return { ...prev, [habitId]: merged }
    })
    try {
      await setEntryApi(habitId, entryDate, next)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update entry'
      setError(msg)
      fetchHabitsAndEntries()
      throw err
    }
  }, [])

  /* Legacy setEntry(habitId, date, status) kept for compatibility; table will use cycleEntry only. */
  const setEntry = useCallback(
    async (habitId: string, entryDate: string, status: 'completed' | 'skipped' | null) => {
      setError(null)
      setEntriesByHabit((prev) => {
        const entries = prev[habitId] ?? []
        const withoutDate = entries.filter((e) => e.entry_date !== entryDate)
        if (status === null) {
          return { ...prev, [habitId]: withoutDate }
        }
        const existing = entries.find((e) => e.entry_date === entryDate)
        const newEntry: HabitEntry = {
          id: existing?.id ?? '',
          habit_id: habitId,
          entry_date: entryDate,
          status,
          created_at: existing?.created_at ?? new Date().toISOString(),
        }
        const next = withoutDate.concat(newEntry).sort((a, b) => a.entry_date.localeCompare(b.entry_date))
        return { ...prev, [habitId]: next }
      })
      try {
        await setEntryApi(habitId, entryDate, status)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update entry'
        setError(msg)
        fetchHabitsAndEntries()
        throw err
      }
    },
    []
  )

  const goToPrevWeek = useCallback(() => {
    setDateRange((prev) => ({
      start: addDays(prev.start, -7),
      end: addDays(prev.end, -7),
    }))
  }, [])

  const goToNextWeek = useCallback(() => {
    setDateRange((prev) => ({
      start: addDays(prev.start, 7),
      end: addDays(prev.end, 7),
    }))
  }, [])

  /* Move date range backward/forward by the current range length (e.g. 3 days on mobile, 7 on desktop) */
  const goToPrevRange = useCallback(() => {
    setDateRange((prev) => {
      const start = new Date(prev.start + 'T12:00:00')
      const end = new Date(prev.end + 'T12:00:00')
      const days = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
      return {
        start: addDays(prev.start, -days),
        end: addDays(prev.end, -days),
      }
    })
  }, [])

  const goToNextRange = useCallback(() => {
    setDateRange((prev) => {
      const start = new Date(prev.start + 'T12:00:00')
      const end = new Date(prev.end + 'T12:00:00')
      const days = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
      return {
        start: addDays(prev.start, days),
        end: addDays(prev.end, days),
      }
    })
  }, [])

  const setWeekToToday = useCallback(() => {
    setDateRange(weekRangeForDate(todayYMD()))
  }, [])

  return {
    habits,
    habitsWithStreaks,
    entriesByHabit: entriesInRange,
    loading,
    error,
    dateRange,
    setDateRange,
    todayYMD: today,
    refetch: fetchHabitsAndEntries,
    createHabit: createHabitHandler,
    updateHabit: updateHabitHandler,
    deleteHabit: deleteHabitHandler,
    setEntry,
    cycleEntry,
    goToPrevWeek,
    goToNextWeek,
    goToPrevRange,
    goToNextRange,
    nextThreeDaysRange,
    setWeekToToday,
  }
}
