/* IntegrationsSettingsSection: Calendar integrations — Google Calendar connect/disconnect */

import type { ReactNode } from 'react'
import { GoogleIcon } from '../../auth/components/GoogleIcon'
import { MaterialIcon, SettingsCard, SettingsSectionHeader } from '../components'
import { useGoogleCalendarConnection } from '../hooks/useGoogleCalendarConnection'

/** Fixed-size logo tile for integration rows (prevents flex shrink) */
function IntegrationLogoBox({
  children,
  muted = false,
}: {
  children: ReactNode
  muted?: boolean
}) {
  return (
    <div
      className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-white [&_.material-symbols-outlined]:text-[22px] [&_.material-symbols-outlined]:leading-none [&_svg]:size-6 ${
        muted ? 'border border-outline-variant/10' : 'shadow-sm'
      }`}
    >
      {children}
    </div>
  )
}

interface IntegrationsSettingsSectionProps {
  /** Optional banner message from OAuth return (e.g. after Google redirect) */
  oauthBannerMessage?: string | null
  /** Called after OAuth return is handled so parent can clear the banner */
  onOAuthBannerDismiss?: () => void
}

/**
 * Account integrations: Google Calendar (read-only agenda) plus coming-soon providers.
 */
export function IntegrationsSettingsSection({
  oauthBannerMessage = null,
  onOAuthBannerDismiss,
}: IntegrationsSettingsSectionProps) {
  /* Google Calendar connection state via edge functions */
  const { loading, connected, message, startConnect, disconnect } = useGoogleCalendarConnection()

  /* Surface OAuth return banner or hook message */
  const statusMessage = oauthBannerMessage ?? message

  return (
    <section>
      <SettingsSectionHeader icon="hub" title="Account & Integrations" />

      <SettingsCard className="space-y-4">
        {statusMessage ? (
          <div
            className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-3"
            role="status"
          >
            <p className="text-secondary text-on-surface">{statusMessage}</p>
            {oauthBannerMessage && onOAuthBannerDismiss ? (
              <button
                type="button"
                onClick={onOAuthBannerDismiss}
                className="text-secondary mt-2 text-primary hover:underline"
              >
                Dismiss
              </button>
            ) : null}
          </div>
        ) : null}

        <GoogleCalendarIntegration
          connected={connected}
          loading={loading}
          onConnect={() => void startConnect()}
          onDisconnect={() => void disconnect()}
        />

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

/** Google Calendar row: read-only agenda for Morning Briefing */
function GoogleCalendarIntegration({
  connected,
  loading,
  onConnect,
  onDisconnect,
}: {
  connected: boolean
  loading: boolean
  onConnect: () => void
  onDisconnect: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-outline-variant/10 bg-surface-container-low/50 p-6 sm:flex-row">
      <div className="flex items-center gap-4">
        <IntegrationLogoBox>
          <GoogleIcon />
        </IntegrationLogoBox>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-body font-semibold text-on-surface">Google Calendar</h3>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                connected
                  ? 'bg-primary-container/40 text-primary'
                  : 'bg-outline-variant/30 text-outline'
              }`}
            >
              {connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <p className="text-secondary text-on-surface-variant">
            Read-only access to show today&apos;s events in your Morning Briefing agenda.
          </p>
        </div>
      </div>
      {connected ? (
        <button
          type="button"
          disabled={loading}
          onClick={onDisconnect}
          className="rounded-lg border border-outline-variant px-6 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
        >
          {loading ? 'Disconnecting…' : 'Disconnect'}
        </button>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={onConnect}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          {loading ? 'Connecting…' : 'Connect'}
        </button>
      )}
    </div>
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
        <IntegrationLogoBox muted>{icon}</IntegrationLogoBox>
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
