/* vacationMode: Parse and evaluate habit vacation mode from auth user_metadata */

export interface VacationModeConfig {
  /** Whether vacation mode is enabled in settings */
  enabled: boolean
  /** Inclusive start date YYYY-MM-DD */
  start: string | null
  /** Inclusive end date YYYY-MM-DD */
  end: string | null
}

export type VacationModeStatus = 'inactive' | 'scheduled' | 'active' | 'expired'

/** Predicate passed into streak math to mark neutral vacation days */
export type VacationDayPredicate = (ymd: string) => boolean

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

/** Normalize a metadata string to YYYY-MM-DD or null */
function parseYMD(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return YMD_RE.test(trimmed) ? trimmed : null
}

/** Parse vacation mode fields from Supabase auth user_metadata */
export function parseVacationModeFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): VacationModeConfig {
  const enabled = metadata?.vacation_mode_enabled === true
  const start = parseYMD(metadata?.vacation_mode_start)
  const end = parseYMD(metadata?.vacation_mode_end)
  return { enabled, start, end }
}

/** True when ymd is within the inclusive vacation date range */
export function isVacationDay(ymd: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false
  return ymd >= start && ymd <= end
}

/** Build a predicate from parsed config for streak calculations */
export function vacationDayPredicateFromConfig(config: VacationModeConfig): VacationDayPredicate {
  const { start, end } = config
  return (ymd: string) => isVacationDay(ymd, start, end)
}

/** True when vacation mode is enabled and today falls within the scheduled range */
export function isVacationModeActive(
  metadata: Record<string, unknown> | null | undefined,
  todayYMD: string,
): boolean {
  const config = parseVacationModeFromMetadata(metadata)
  if (!config.enabled || !config.start || !config.end) return false
  return isVacationDay(todayYMD, config.start, config.end)
}

/** UI status for settings and habits banner copy */
export function getVacationModeStatus(
  metadata: Record<string, unknown> | null | undefined,
  todayYMD: string,
): VacationModeStatus {
  const config = parseVacationModeFromMetadata(metadata)
  if (!config.enabled || !config.start || !config.end) return 'inactive'
  if (todayYMD > config.end) return 'expired'
  if (todayYMD < config.start) return 'scheduled'
  return 'active'
}

/** True when the saved range has ended and should be cleared from metadata */
export function isVacationModeExpired(
  metadata: Record<string, unknown> | null | undefined,
  todayYMD: string,
): boolean {
  return getVacationModeStatus(metadata, todayYMD) === 'expired'
}

/** Validate start/end before persisting; throws on invalid input */
export function validateVacationModeRange(start: string, end: string): void {
  if (!YMD_RE.test(start) || !YMD_RE.test(end)) {
    throw new Error('Start and end dates are required.')
  }
  if (end < start) {
    throw new Error('End date must be on or after the start date.')
  }
}
