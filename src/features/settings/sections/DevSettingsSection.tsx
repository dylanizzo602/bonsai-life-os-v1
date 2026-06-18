/* DevSettingsSection: Developer-only toggles (local preference) */

import { MaterialIcon, SettingsCard, SettingsSectionHeader, SettingsToggle } from '../components'
import { useDevMode } from '../hooks/useDevMode'

/**
 * Developer settings — enables extra nav items and tools for internal QA.
 */
export function DevSettingsSection() {
  const { devModeEnabled, setDevModeEnabled } = useDevMode()

  return (
    <section>
      <SettingsSectionHeader icon="code" title="Developer" />

      <SettingsCard className="space-y-6">
        <p className="text-secondary text-on-surface-variant">
          Dev mode adds internal tools to the app. Saved on this device only.
        </p>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <label className="text-body font-semibold text-on-surface">Dev mode</label>
            <p className="text-secondary text-on-surface-variant">
              Shows Briefing Preview in the top navigation for walking the full briefing flow
              without saving responses.
            </p>
          </div>
          <SettingsToggle
            checked={devModeEnabled}
            onChange={setDevModeEnabled}
            ariaLabel="Enable dev mode"
          />
        </div>

        {devModeEnabled ? (
          <div className="flex items-center gap-2 rounded-lg border border-tertiary/30 bg-tertiary-container/30 px-3 py-2">
            <MaterialIcon name="science" className="text-[18px] text-tertiary" />
            <p className="text-secondary text-on-surface">
              Briefing Preview is available in the main navigation.
            </p>
          </div>
        ) : null}
      </SettingsCard>
    </section>
  )
}
