/* BriefingSettingsSection: Morning briefing and weekly review preferences (local UI) */

import { useState } from 'react'
import { MaterialIcon, SettingsCard, SettingsSectionHeader, SettingsToggle } from '../components'

const WEEKDAY_OPTIONS = [
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
]

/**
 * Briefing schedule toggles — persisted preferences coming in a future release.
 */
export function BriefingSettingsSection() {
  const [morningEnabled, setMorningEnabled] = useState(true)
  const [morningTime, setMorningTime] = useState('08:30')
  const [weeklyEnabled, setWeeklyEnabled] = useState(true)
  const [weeklyDay, setWeeklyDay] = useState('0')

  return (
    <section>
      <SettingsSectionHeader icon="schedule" title="Briefing Settings" />

      <SettingsCard className="space-y-8">
        <p className="text-secondary text-on-surface-variant">
          Schedule preferences are saved locally for now; cloud sync is coming soon.
        </p>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-body font-semibold text-on-surface">Morning Briefing</label>
              <SettingsToggle
                checked={morningEnabled}
                onChange={setMorningEnabled}
                ariaLabel="Enable morning briefing"
              />
            </div>
            <div className="flex items-center gap-4">
              <MaterialIcon name="alarm" className="text-sm text-outline" />
              <input
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                disabled={!morningEnabled}
                className="border-none bg-transparent p-0 text-body font-medium text-on-surface focus:ring-0 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-body font-semibold text-on-surface">Weekly Review</label>
              <SettingsToggle
                checked={weeklyEnabled}
                onChange={setWeeklyEnabled}
                ariaLabel="Enable weekly review"
              />
            </div>
            <div className="flex items-center gap-4">
              <MaterialIcon name="calendar_month" className="text-sm text-outline" />
              <select
                value={weeklyDay}
                onChange={(e) => setWeeklyDay(e.target.value)}
                disabled={!weeklyEnabled}
                className="cursor-pointer appearance-none border-none bg-transparent p-0 text-body font-medium text-on-surface focus:ring-0 disabled:opacity-50"
              >
                {WEEKDAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </SettingsCard>
    </section>
  )
}
