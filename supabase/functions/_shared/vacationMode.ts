/* vacationMode (edge): mirror client vacation mode helpers for notification cron */

export interface VacationModeConfig {
  enabled: boolean
  start: string | null
  end: string | null
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

function parseYMD(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return YMD_RE.test(trimmed) ? trimmed : null
}

export function parseVacationModeFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): VacationModeConfig {
  const enabled = metadata?.vacation_mode_enabled === true
  const start = parseYMD(metadata?.vacation_mode_start)
  const end = parseYMD(metadata?.vacation_mode_end)
  return { enabled, start, end }
}

export function isVacationDay(ymd: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false
  return ymd >= start && ymd <= end
}

export function isVacationModeActive(
  metadata: Record<string, unknown> | null | undefined,
  todayYMD: string,
): boolean {
  const config = parseVacationModeFromMetadata(metadata)
  if (!config.enabled || !config.start || !config.end) return false
  return isVacationDay(todayYMD, config.start, config.end)
}
