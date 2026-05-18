/* ProfileSettingsSection: Profile fields, avatar placeholder, password reset */

import { useMemo, useState } from 'react'
import {
  MaterialIcon,
  SettingsCard,
  SettingsSectionHeader,
  SettingsUnderlineInput,
  SettingsUnderlineSelect,
} from '../components'
import { PROFILE_TIME_ZONE_OPTIONS } from '../../../lib/timezone'
import { sendPasswordResetEmail } from '../../../lib/supabase/auth'

export interface ProfileSettingsSectionProps {
  firstName: string
  lastName: string
  email: string
  timeZone: string
  location: string
  saving: boolean
  locating: boolean
  disabled: boolean
  onFieldChange: (field: 'firstName' | 'lastName' | 'email' | 'timeZone' | 'location', value: string) => void
  onSave: () => void
  onAutofillLocation: () => void
}

/**
 * Profile info card: name, email, timezone, location, and password reset.
 */
export function ProfileSettingsSection({
  firstName,
  lastName,
  email,
  timeZone,
  location,
  saving,
  locating,
  disabled,
  onFieldChange,
  onSave,
  onAutofillLocation,
}: ProfileSettingsSectionProps) {
  const [passwordResetSending, setPasswordResetSending] = useState(false)
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null)

  /* Avatar initials from profile name */
  const initials = useMemo(() => {
    const a = (firstName.trim()[0] ?? '').toUpperCase()
    const b = (lastName.trim()[0] ?? '').toUpperCase()
    return (a + b || '?').slice(0, 2)
  }, [firstName, lastName])

  /* Password reset: email link via Supabase */
  const handleResetPassword = async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      setPasswordResetMessage('Add an email address first.')
      return
    }
    setPasswordResetSending(true)
    setPasswordResetMessage(null)
    const { error } = await sendPasswordResetEmail(trimmed)
    setPasswordResetSending(false)
    if (error) {
      setPasswordResetMessage(error.message)
      return
    }
    setPasswordResetMessage('Check your inbox for a password reset link.')
  }

  return (
    <section>
      <SettingsSectionHeader icon="person" title="Profile Info" />

      <SettingsCard>
        <div className="mb-10 flex flex-col items-start gap-8 md:flex-row">
          {/* Avatar placeholder */}
          <div className="group relative shrink-0">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-high text-2xl font-semibold text-primary">
              {initials}
            </div>
            <button
              type="button"
              disabled
              title="Profile photo coming soon"
              className="absolute -bottom-2 -right-2 rounded-lg bg-primary p-2 text-on-primary opacity-60 shadow-lg"
              aria-label="Edit profile photo (coming soon)"
            >
              <MaterialIcon name="edit" className="text-sm" />
            </button>
          </div>

          {/* Profile fields grid */}
          <div className="w-full flex-1">
            <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
              <SettingsUnderlineInput
                label="First name"
                value={firstName}
                onChange={(e) => onFieldChange('firstName', e.target.value)}
                autoComplete="given-name"
                disabled={disabled}
              />
              <SettingsUnderlineInput
                label="Last name"
                value={lastName}
                onChange={(e) => onFieldChange('lastName', e.target.value)}
                autoComplete="family-name"
                disabled={disabled}
              />
              <SettingsUnderlineInput
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => onFieldChange('email', e.target.value)}
                autoComplete="email"
                disabled={disabled}
              />
              <SettingsUnderlineSelect
                label="Time zone"
                value={timeZone}
                onChange={(e) => onFieldChange('timeZone', e.target.value)}
                options={PROFILE_TIME_ZONE_OPTIONS}
                disabled={disabled}
              />
              <SettingsUnderlineInput
                label="Location"
                value={location}
                onChange={(e) => onFieldChange('location', e.target.value)}
                placeholder="City, Country"
                autoComplete="address-level2"
                disabled={disabled || locating}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => void onAutofillLocation()}
                disabled={disabled || locating}
                className="text-secondary font-medium text-primary hover:underline disabled:opacity-50"
              >
                {locating ? 'Finding location…' : 'Auto-fill location'}
              </button>
              <button
                type="button"
                onClick={() => void onSave()}
                disabled={disabled || saving}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Password & security row */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-outline-variant/20 pt-8 sm:flex-row">
          <div>
            <h3 className="text-body font-semibold text-on-surface">Password &amp; Security</h3>
            <p className="text-secondary text-on-surface-variant">
              Secure your account by updating your credentials.
            </p>
            {passwordResetMessage ? (
              <p className="text-secondary mt-2 text-primary">{passwordResetMessage}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void handleResetPassword()}
            disabled={disabled || passwordResetSending}
            className="rounded-lg border border-primary px-6 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
          >
            {passwordResetSending ? 'Sending…' : 'Reset Password'}
          </button>
        </div>
      </SettingsCard>
    </section>
  )
}
