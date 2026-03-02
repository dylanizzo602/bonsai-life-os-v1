/* Settings page: Account settings form for profile, auth, and location */
import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAccountSettings } from './hooks/useAccountSettings'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'

/**
 * Settings page component
 * Displays account information, allows editing of profile details, email, password, and location, and supports logout.
 */
export function SettingsPage() {
  /* Auth context: access current user and sign-out action */
  const { user, signOut } = useAuth()
  /* Account settings hook: manage form state and update actions */
  const {
    firstName,
    lastName,
    location,
    email,
    saving,
    locating,
    error,
    success,
    clearStatus,
    setField,
    autofillLocation,
    saveProfile,
    saveEmail,
    savePassword,
  } = useAccountSettings(user)

  /* Local password field state: keep separate from main hook state */
  const [password, setPassword] = useState('')

  /* Derived full name for display-only summary */
  const displayName = useMemo(() => {
    const parts = [firstName, lastName].filter(Boolean)
    return parts.join(' ') || 'No name set'
  }, [firstName, lastName])

  /* Handler: wrapper to call saveProfile and clear previous messages if needed */
  const handleSaveProfile = async () => {
    clearStatus()
    await saveProfile()
  }

  /* Handler: attempt to auto-fill location from current device position */
  const handleAutofillLocation = async () => {
    clearStatus()
    await autofillLocation()
  }

  /* Handler: wrapper to call saveEmail and clear previous messages if needed */
  const handleSaveEmail = async () => {
    clearStatus()
    await saveEmail()
  }

  /* Handler: wrapper to call savePassword and clear previous messages if needed */
  const handleSavePassword = async () => {
    clearStatus()
    await savePassword(password)
    setPassword('')
  }

  /* Handler: sign the user out via auth context */
  const handleSignOut = async () => {
    clearStatus()
    await signOut()
  }

  return (
    <div className="min-h-full">
      {/* Section header: Display section name */}
      <h1 className="text-page-title font-bold text-bonsai-brown-700 mb-6">Settings</h1>

      {/* Layout container: stack on mobile, two-column on larger screens */}
      <div className="w-full h-full min-h-[60vh] grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-8">
        {/* Left column: editable account fields */}
        <div className="space-y-6">
          {/* Profile section: first name, last name, and location */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Profile</h2>
            <p className="text-secondary text-bonsai-slate-600 mb-4">
              Update your basic profile details so Bonsai can personalize your experience.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="First name"
                value={firstName}
                onChange={(e) => setField('firstName', e.target.value)}
                placeholder="First name"
                autoComplete="given-name"
                disabled={!user || saving}
              />
              <Input
                label="Last name"
                value={lastName}
                onChange={(e) => setField('lastName', e.target.value)}
                placeholder="Last name"
                autoComplete="family-name"
                disabled={!user || saving}
              />
            </div>
            <div className="mb-4">
              <Input
                label="Location"
                value={location}
                onChange={(e) => setField('location', e.target.value)}
                placeholder="City, Country"
                autoComplete="address-level2"
                disabled={!user || saving || locating}
              />
              <div className="mt-2 flex items-center justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleAutofillLocation}
                  disabled={!user || saving || locating}
                >
                  {locating ? 'Finding location…' : 'Auto-fill from current location'}
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveProfile}
                disabled={!user || saving || locating}
              >
                {saving ? 'Saving…' : 'Save profile'}
              </Button>
            </div>
          </section>

          {/* Email section: change sign-in email address */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Email address</h2>
            <p className="text-secondary text-bonsai-slate-600 mb-4">
              Change the email you use to sign in. You may need to confirm this change from your
              inbox.
            </p>
            <div className="mb-4">
              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={!user || saving}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveEmail}
                disabled={!user || saving}
              >
                {saving ? 'Saving…' : 'Update email'}
              </Button>
            </div>
          </section>

          {/* Password section: update password securely */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Password</h2>
            <p className="text-secondary text-bonsai-slate-600 mb-4">
              Set a new password for your account. Make sure it is strong and unique.
            </p>
            <div className="mb-4">
              <Input
                type="password"
                label="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a new password"
                autoComplete="new-password"
                disabled={!user || saving}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleSavePassword}
                disabled={!user || saving || !password.trim()}
              >
                {saving ? 'Saving…' : 'Update password'}
              </Button>
            </div>
          </section>
        </div>

        {/* Right column: account summary and logout */}
        <aside className="space-y-4">
          {/* Account summary card: show key details for quick reference */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Account</h2>
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-secondary text-bonsai-slate-600">Name</dt>
                <dd className="text-body text-bonsai-slate-800 text-right">{displayName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-secondary text-bonsai-slate-600">Email</dt>
                <dd className="text-body text-bonsai-slate-800 text-right">
                  {email || 'No email set'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-secondary text-bonsai-slate-600">Location</dt>
                <dd className="text-body text-bonsai-slate-800 text-right">
                  {location || 'No location set'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Status messages: show latest error or success feedback */}
          {(error || success) && (
            <section className="rounded-xl p-4 bg-bonsai-slate-50 border border-bonsai-slate-200">
              {error && (
                <p className="text-secondary text-red-600 mb-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-secondary text-bonsai-sage-700">
                  {success}
                </p>
              )}
            </section>
          )}

          {/* Logout card: sign out of the current account */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Sign out</h2>
            <p className="text-secondary text-bonsai-slate-600 mb-4">
              You&apos;ll be signed out of Bonsai on this device. You can sign back in at any time.
            </p>
            <Button
              type="button"
              variant="danger"
              onClick={handleSignOut}
              disabled={!user}
            >
              Log out
            </Button>
          </section>
        </aside>
      </div>
    </div>
  )
}

