/* VacationModeProvider: supplies vacation mode state and auto-clears expired schedules */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  getVacationModeStatus,
  isVacationDay,
  isVacationModeActive,
  isVacationModeExpired,
  parseVacationModeFromMetadata,
} from '../../lib/vacationMode'
import { clearVacationModeMetadata } from '../../lib/supabase/vacationMode'
import { VacationModeContext } from './vacationModeContext'

interface VacationModeProviderProps {
  children: ReactNode
}

/** Local calendar YYYY-MM-DD */
function localTodayYMD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Supplies vacation mode state to descendants. Must render inside AuthProvider.
 */
export function VacationModeProvider({ children }: VacationModeProviderProps) {
  const { user } = useAuth()
  const [todayYMD, setTodayYMD] = useState(() => localTodayYMD())

  /* Midnight rollover: refresh today so active/scheduled status updates */
  useEffect(() => {
    const now = new Date()
    const nextMidnight = new Date(now)
    nextMidnight.setDate(nextMidnight.getDate() + 1)
    nextMidnight.setHours(0, 0, 0, 0)
    const delay = nextMidnight.getTime() - now.getTime()
    const timeoutId = setTimeout(() => setTodayYMD(localTodayYMD()), delay)
    return () => clearTimeout(timeoutId)
  }, [todayYMD])

  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>

  /* Expired schedules: clear metadata so settings toggle reflects reality */
  const clearExpiredIfNeeded = useCallback(async () => {
    if (!user) return
    if (!isVacationModeExpired(metadata, todayYMD)) return
    try {
      await clearVacationModeMetadata()
    } catch (error) {
      console.error('Failed to clear expired vacation mode:', error)
    }
  }, [user, metadata, todayYMD])

  useEffect(() => {
    void clearExpiredIfNeeded()
  }, [clearExpiredIfNeeded])

  const value = useMemo(() => {
    const config = parseVacationModeFromMetadata(metadata)
    const status = getVacationModeStatus(metadata, todayYMD)
    const isActive = isVacationModeActive(metadata, todayYMD)
    const isVacationDayFn =
      config.enabled && config.start && config.end
        ? (ymd: string) => isVacationDay(ymd, config.start, config.end)
        : () => false
    return {
      config,
      isActive,
      status,
      isVacationDay: isVacationDayFn,
      todayYMD,
    }
  }, [metadata, todayYMD])

  return (
    <VacationModeContext.Provider value={value}>{children}</VacationModeContext.Provider>
  )
}
