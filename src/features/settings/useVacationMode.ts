/* useVacationMode: read vacation mode state from VacationModeProvider */
import { useContext } from 'react'
import {
  getVacationModeStatus,
  isVacationDay,
  isVacationModeActive,
  parseVacationModeFromMetadata,
  type VacationModeConfig,
  type VacationModeStatus,
} from '../../lib/vacationMode'
import { VacationModeContext } from './vacationModeContext'

/** Local calendar YYYY-MM-DD */
function localTodayYMD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const INACTIVE_CONFIG: VacationModeConfig = { enabled: false, start: null, end: null }

const FALLBACK_VALUE = {
  config: INACTIVE_CONFIG,
  isActive: false,
  status: 'inactive' as VacationModeStatus,
  isVacationDay: () => false,
  todayYMD: localTodayYMD(),
}

/**
 * Returns vacation mode state for the signed-in user.
 * Safe fallback when used outside VacationModeProvider (tests).
 */
export function useVacationMode() {
  const ctx = useContext(VacationModeContext)
  if (ctx !== undefined) return ctx

  return FALLBACK_VALUE
}

/** Standalone helpers for metadata without provider (edge cases, tests) */
export function getVacationModeFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  todayYMD: string = localTodayYMD(),
) {
  const config = parseVacationModeFromMetadata(metadata)
  const status = getVacationModeStatus(metadata, todayYMD)
  const isActive = isVacationModeActive(metadata, todayYMD)
  const isVacationDayFn = (ymd: string) => isVacationDay(ymd, config.start, config.end)
  return { config, status, isActive, isVacationDay: isVacationDayFn, todayYMD }
}
