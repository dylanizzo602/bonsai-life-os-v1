/* React context: vacation mode state shared across habits, notifications, and settings */
import { createContext } from 'react'
import type { VacationModeConfig, VacationModeStatus } from '../../lib/vacationMode'

export interface VacationModeContextValue {
  /** Parsed vacation config from user metadata */
  config: VacationModeConfig
  /** Whether today is inside the active vacation range */
  isActive: boolean
  /** scheduled | active | inactive | expired */
  status: VacationModeStatus
  /** True when ymd is a vacation day (for streak math) */
  isVacationDay: (ymd: string) => boolean
  /** Local today YYYY-MM-DD used for status checks */
  todayYMD: string
}

export const VacationModeContext = createContext<VacationModeContextValue | undefined>(undefined)
