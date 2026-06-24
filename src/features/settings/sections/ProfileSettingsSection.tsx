/* ProfileSettingsSection: Profile fields, avatar upload, password reset */

import type { ChangeEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import { ProfileAvatar } from '../../../components/ProfileAvatar'
import {
  MaterialIcon,
  SettingsCard,
  SettingsSectionHeader,
  SettingsUnderlineInput,
  SettingsUnderlineSelect,
} from '../components'
import { ResetPasswordModal } from '../../auth/ResetPasswordModal'
import { PROFILE_TIME_ZONE_OPTIONS } from '../../../lib/timezone'

export interface ProfileSettingsSectionProps {
  firstName: string
  lastName: string
  email: string
  timeZone: string
  location: string
  saving: boolean
  /** When true, at least one profile field differs from the last saved values */
  hasUnsavedChanges: boolean
  disabled: boolean
  /** Current avatar URL for display */
  avatarUrl?: string | null
  /** True while avatar upload is in progress */
  avatarUploading?: boolean
  /** Avatar-specific error message */
  avatarError?: string | null
  onFieldChange: (field: 'firstName' | 'lastName' | 'email' | 'timeZone' | 'location', value: string) => void
  onSave: () => void
  onUploadAvatar?: (file: File) => Promise<void>
}

/**
 * Profile info card: name, email, timezone, location, avatar, and password reset.
 */
export function ProfileSettingsSection({
  firstName,
  lastName,
  email,
  timeZone,
  location,
  saving,
  hasUnsavedChanges,
  disabled,
  avatarUrl = null,
  avatarUploading = false,
  avatarError = null,
  onFieldChange,
  onSave,
  onUploadAvatar,
}: ProfileSettingsSectionProps) {
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  /* Avatar initials from profile name (form state, may differ before save) */
  const initials = useMemo(() => {
    const a = (firstName.trim()[0] ?? '').toUpperCase()
    const b = (lastName.trim()[0] ?? '').toUpperCase()
    return (a + b || '?').slice(0, 2)
  }, [firstName, lastName])

  /* File picker: upload selected image immediately */
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUploadAvatar) return
    try {
      await onUploadAvatar(file)
    } catch {
      /* Hook surfaces error via avatarError prop */
    } finally {
      e.target.value = ''
    }
  }

  const avatarDisabled = disabled || avatarUploading || !onUploadAvatar

  return (
    <section>
      <SettingsSectionHeader icon="person" title="Profile Info" />

      <SettingsCard>
        <div className="mb-10 flex flex-col items-start gap-8 md:flex-row">
          {/* Avatar upload */}
          <div className="group relative shrink-0">
            <div className="relative">
              <ProfileAvatar
                avatarUrl={avatarUrl}
                initials={initials}
                size="lg"
                shape="rounded"
                className="border-outline-variant"
              />
              {avatarUploading ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-on-surface/40">
                  <span className="text-secondary text-on-primary">Uploading…</span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              disabled={avatarDisabled}
              title="Change profile photo"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 rounded-lg bg-primary p-2 text-on-primary shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
              aria-label="Change profile photo"
            >
              <MaterialIcon name="edit" className="text-sm" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => void handleFileChange(e)}
              disabled={avatarDisabled}
              aria-hidden
            />
            {avatarError ? (
              <p className="text-secondary mt-2 max-w-[12rem] text-error">{avatarError}</p>
            ) : null}
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
                disabled={disabled}
              />
            </div>

            {hasUnsavedChanges ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void onSave()}
                  disabled={disabled || saving}
                  className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Password & security: centered on mobile, row layout on sm+ */}
        <div className="flex flex-col items-center gap-4 border-t border-outline-variant/20 pt-8 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:text-left">
          <div className="w-full min-w-0 sm:flex-1">
            <h3 className="text-body font-semibold text-on-surface">Password &amp; Security</h3>
            <p className="text-secondary mx-auto mt-1 max-w-md text-on-surface-variant sm:mx-0">
              Secure your account by updating your credentials.
            </p>
            {passwordResetMessage ? (
              <p className="text-secondary mx-auto mt-2 max-w-md text-primary sm:mx-0">
                {passwordResetMessage}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              setPasswordResetMessage(null)
              setResetModalOpen(true)
            }}
            disabled={disabled}
            className="w-full shrink-0 rounded-lg border border-primary px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50 sm:w-auto"
          >
            Reset Password
          </button>
        </div>
      </SettingsCard>

      <ResetPasswordModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onSuccess={(message) => setPasswordResetMessage(message)}
      />
    </section>
  )
}
