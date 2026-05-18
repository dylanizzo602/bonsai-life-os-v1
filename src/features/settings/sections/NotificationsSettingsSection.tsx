/* NotificationsSettingsSection: Per-type notification matrix (web, email, mobile) */

import type { NotificationChannel, NotificationType } from '../../../lib/notifications/types'
import { SettingsCard, SettingsSectionHeader } from '../components'

const TYPE_LABELS: Record<NotificationType, { title: string; description?: string }> = {
  task_due_soon: { title: 'Tasks due soon', description: 'Notify before tasks are due.' },
  task_overdue: { title: 'Overdue tasks', description: 'Daily summary of items past their due date.' },
  habit_reminder_due: { title: 'Habit reminders', description: 'Stay consistent with your daily rituals.' },
  morning_briefing_incomplete_noon: {
    title: 'Morning briefing incomplete',
    description: 'Remind by 12pm',
  },
  reminder_due: { title: 'Reminders due', description: 'Custom reminders you set on tasks.' },
}

const CHANNEL_LABELS: { key: NotificationChannel; label: string }[] = [
  { key: 'push_web', label: 'Web' },
  { key: 'email', label: 'Email' },
  { key: 'push_mobile', label: 'Mobile' },
]

export interface NotificationsSettingsSectionProps {
  loading: boolean
  saving: boolean
  error: string | null
  types: NotificationType[]
  notificationPermission: NotificationPermission | 'unsupported'
  isEnabled: (type: NotificationType, channel: NotificationChannel) => boolean
  onToggle: (type: NotificationType, channel: NotificationChannel) => void
  onEnableBrowserNotifications: () => void
  disabled: boolean
}

/**
 * Notification preference grid matching zenith settings layout.
 */
export function NotificationsSettingsSection({
  loading,
  saving,
  error,
  types,
  notificationPermission,
  isEnabled,
  onToggle,
  onEnableBrowserNotifications,
  disabled,
}: NotificationsSettingsSectionProps) {
  return (
    <section>
      <SettingsSectionHeader icon="notifications_active" title="Notifications & Guidance" />

      <SettingsCard className="overflow-hidden p-0">
        {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
          <div className="flex flex-col gap-3 border-b border-outline-variant/10 bg-surface-container-low/80 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-secondary text-on-surface-variant">
              Enable browser notifications for web alerts while Bonsai is open.
            </p>
            <button
              type="button"
              onClick={() => void onEnableBrowserNotifications()}
              disabled={disabled}
              className="shrink-0 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
            >
              Enable web notifications
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 border-b border-outline-variant/10 bg-surface-container-low p-6 md:grid-cols-12">
          <div className="md:col-span-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Notification Type
            </span>
          </div>
          {CHANNEL_LABELS.map((ch) => (
            <div key={ch.key} className="text-center md:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline">{ch.label}</span>
            </div>
          ))}
        </div>

        <div className="divide-y divide-outline-variant/10">
          {types.map((type) => {
            const meta = TYPE_LABELS[type]
            return (
              <div
                key={type}
                className="grid grid-cols-1 items-center gap-4 p-6 md:grid-cols-12"
              >
                <div className="md:col-span-6">
                  <h3 className="text-body font-medium text-on-surface">{meta.title}</h3>
                  {meta.description ? (
                    <p
                      className={`text-secondary mt-1 ${
                        type === 'morning_briefing_incomplete_noon'
                          ? 'font-semibold text-primary'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      {meta.description}
                    </p>
                  ) : null}
                  {type === 'task_due_soon' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-secondary text-on-surface-variant">Notify me</span>
                      <select
                        disabled
                        className="rounded bg-surface-container-high px-2 py-0.5 text-secondary font-semibold focus:ring-primary/20"
                        defaultValue="60"
                        title="Lead time options coming soon"
                      >
                        <option value="15">15 mins before</option>
                        <option value="30">30 mins before</option>
                        <option value="60">1 hour before</option>
                        <option value="120">2 hours before</option>
                      </select>
                    </div>
                  )}
                </div>
                {CHANNEL_LABELS.map((ch) => (
                  <div key={ch.key} className="flex justify-center md:col-span-2">
                    <input
                      type="checkbox"
                      checked={isEnabled(type, ch.key)}
                      onChange={() => void onToggle(type, ch.key)}
                      disabled={disabled || loading || saving}
                      className="h-5 w-5 rounded text-primary focus:ring-primary/20"
                      aria-label={`${meta.title} via ${ch.label}`}
                    />
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {error ? <p className="text-secondary px-6 pb-6 text-error">{error}</p> : null}
        {loading ? (
          <p className="text-secondary px-6 pb-6 text-on-surface-variant">Loading preferences…</p>
        ) : null}
      </SettingsCard>
    </section>
  )
}
