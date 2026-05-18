/* BillingSettingsSection: Subscription placeholder (coming soon) */

import { MaterialIcon, SettingsCard, SettingsSectionHeader } from '../components'

/**
 * Billing card — visual placeholder until subscription billing ships.
 */
export function BillingSettingsSection() {
  return (
    <section>
      <SettingsSectionHeader icon="payments" title="Billing & Subscription" />

      <SettingsCard className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container">
            <MaterialIcon name="star" className="text-primary" />
          </div>
          <div>
            <h3 className="text-body font-semibold text-on-surface">Bonsai Pro</h3>
            <p className="text-secondary text-on-surface-variant">
              Subscription management is coming soon.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg border border-outline px-6 py-2 text-sm font-semibold text-on-surface-variant opacity-60"
        >
          Manage Subscription
        </button>
      </SettingsCard>
    </section>
  )
}
