/* IntegrationsSettingsSection: Google Calendar connect and coming-soon calendars */

import type { ReactNode } from 'react'
import { MaterialIcon, SettingsCard, SettingsSectionHeader } from '../components'

export interface IntegrationsSettingsSectionProps {
  connected: boolean
  loading: boolean
  message: string | null
  disabled: boolean
  onConnect: () => void
  onDisconnect: () => void
}

/**
 * Account integrations: Google OAuth calendar plus placeholder rows.
 */
export function IntegrationsSettingsSection({
  connected,
  loading,
  message,
  disabled,
  onConnect,
  onDisconnect,
}: IntegrationsSettingsSectionProps) {
  return (
    <section>
      <SettingsSectionHeader icon="hub" title="Account & Integrations" />

      <SettingsCard className="space-y-4">
        <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-outline-variant/10 bg-surface-container-low p-6 sm:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
              <span className="text-lg font-bold text-[#4285F4]" aria-hidden>
                G
              </span>
            </div>
            <div>
              <h3 className="text-body font-semibold text-on-surface">Google Calendar</h3>
              <p className="text-secondary text-on-surface-variant">
                {connected
                  ? 'Connected — agenda appears in your morning briefing.'
                  : 'Sync your daily tasks with your calendar.'}
              </p>
              {message ? <p className="text-secondary mt-1 text-on-surface-variant">{message}</p> : null}
            </div>
          </div>
          {connected ? (
            <button
              type="button"
              onClick={() => void onDisconnect()}
              disabled={disabled || loading}
              className="rounded-lg border border-outline px-6 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
            >
              {loading ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void onConnect()}
              disabled={disabled || loading}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Connecting…' : 'Connect'}
            </button>
          )}
        </div>

        <ComingSoonIntegration
          title="Outlook Calendar"
          description="Connect your Outlook ecosystem."
          icon={<MaterialIcon name="calendar_today" className="text-[#0078D4]" />}
        />
        <ComingSoonIntegration
          title="Apple Calendar"
          description="Sync with your iCloud events."
          icon={<MaterialIcon name="calendar_month" className="text-on-surface" />}
        />
      </SettingsCard>
    </section>
  )
}

function ComingSoonIntegration({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-outline-variant/5 bg-surface-container-low/50 p-6 opacity-60 grayscale sm:flex-row">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/10 bg-white">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-body font-semibold text-on-surface">{title}</h3>
            <span className="rounded bg-outline-variant/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-outline">
              Coming Soon
            </span>
          </div>
          <p className="text-secondary text-on-surface-variant">{description}</p>
        </div>
      </div>
      <button
        type="button"
        disabled
        className="cursor-not-allowed rounded-lg border border-outline-variant px-6 py-2 text-sm font-semibold text-outline"
      >
        Unavailable
      </button>
    </div>
  )
}
