/* HabitsSettingsSection: Vacation mode scheduling for habit streaks and reminders */

import { useEffect, useState } from 'react'
import { MaterialIcon, SettingsCard, SettingsSectionHeader, SettingsToggle } from '../components'
import { useAuth } from '../../auth/AuthContext'
import {
  getVacationModeStatus,
  parseVacationModeFromMetadata,
  validateVacationModeRange,
} from '../../../lib/vacationMode'
import {
  clearVacationModeMetadata,
  updateVacationModeMetadata,
} from '../../../lib/supabase/vacationMode'

/** Local calendar YYYY-MM-DD */
function localTodayYMD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Format YYYY-MM-DD for display */
function formatDateLabel(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Habits settings: schedule vacation mode with start and end dates.
 */
export function HabitsSettingsSection() {
  const { user } = useAuth()
  const todayYMD = localTodayYMD()
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>
  const parsed = parseVacationModeFromMetadata(metadata)
  const status = getVacationModeStatus(metadata, todayYMD)

  const [enabled, setEnabled] = useState(parsed.enabled)
  const [startDate, setStartDate] = useState(parsed.start ?? todayYMD)
  const [endDate, setEndDate] = useState(parsed.end ?? todayYMD)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Sync form when auth metadata changes (e.g. after save or expiry clear) */
  useEffect(() => {
    setEnabled(parsed.enabled)
    setStartDate(parsed.start ?? todayYMD)
    setEndDate(parsed.end ?? todayYMD)
  }, [parsed.enabled, parsed.start, parsed.end, todayYMD])

  const persist = async (next: { enabled: boolean; start: string; end: string }) => {
    setSaving(true)
    setError(null)
    try {
      if (!next.enabled) {
        await clearVacationModeMetadata()
        return
      }
      validateVacationModeRange(next.start, next.end)
      await updateVacationModeMetadata({
        enabled: true,
        start: next.start,
        end: next.end,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save vacation mode'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    const start = startDate.trim() || todayYMD
    const end = endDate.trim() || start
    void persist({ enabled: checked, start, end })
  }

  const handleStartChange = (value: string) => {
    setStartDate(value)
    if (!enabled) return
    void persist({ enabled: true, start: value, end: endDate })
  }

  const handleEndChange = (value: string) => {
    setEndDate(value)
    if (!enabled) return
    void persist({ enabled: true, start: startDate, end: value })
  }

  const statusMessage =
    status === 'active'
      ? `Vacation mode is active until ${formatDateLabel(endDate)}.`
      : status === 'scheduled'
        ? `Scheduled: starts ${formatDateLabel(startDate)}, ends ${formatDateLabel(endDate)}.`
        : status === 'expired'
          ? 'Your last vacation schedule has ended.'
          : null

  return (
    <section>
      <SettingsSectionHeader icon="beach_access" title="Habits" />

      <SettingsCard className="space-y-6">
        <p className="text-secondary text-on-surface-variant">
          While vacation mode is active, habit streaks are protected, reminders are paused, and you
          cannot log habit entries.
        </p>

        <div className="flex items-center justify-between">
          <label className="text-body font-semibold text-on-surface">Vacation mode</label>
          <SettingsToggle
            checked={enabled}
            onChange={handleToggle}
            disabled={saving}
            ariaLabel="Enable vacation mode"
          />
        </div>

        {enabled && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-secondary font-medium text-on-surface-variant">Start date</label>
              <div className="flex items-center gap-3">
                <MaterialIcon name="calendar_month" className="text-sm text-outline" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartChange(e.target.value)}
                  disabled={saving}
                  className="border-none bg-transparent p-0 text-body font-medium text-on-surface focus:ring-0 disabled:opacity-50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-secondary font-medium text-on-surface-variant">End date</label>
              <div className="flex items-center gap-3">
                <MaterialIcon name="event" className="text-sm text-outline" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndChange(e.target.value)}
                  disabled={saving}
                  className="border-none bg-transparent p-0 text-body font-medium text-on-surface focus:ring-0 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        )}

        {saving && <p className="text-secondary text-on-surface-variant">Saving…</p>}
        {!saving && statusMessage && (
          <p className="text-secondary text-primary">{statusMessage}</p>
        )}
        {error && (
          <p className="text-secondary text-red-600" role="alert">
            {error}
          </p>
        )}
      </SettingsCard>
    </section>
  )
}
