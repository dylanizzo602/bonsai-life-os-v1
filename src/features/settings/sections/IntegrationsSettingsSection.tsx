/* IntegrationsSettingsSection: Calendar integrations (coming soon) */

import type { ReactNode } from 'react'
import { GoogleIcon } from '../../auth/components/GoogleIcon'
import { MaterialIcon, SettingsCard, SettingsSectionHeader } from '../components'

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

/**
 * Account integrations: calendar providers (all coming soon).
 */
export function IntegrationsSettingsSection() {
  return (
    <section>
      <SettingsSectionHeader icon="hub" title="Account & Integrations" />

      <SettingsCard className="space-y-4">
        <ComingSoonIntegration
          title="Google Calendar"
          description="Sync your daily tasks with your calendar."
          icon={<GoogleIcon />}
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
