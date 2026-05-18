/* Reset password modal: Set new password after recovery OTP verification */
import { useEffect, useState } from 'react'
import { updatePassword } from '../../lib/supabase/auth'

interface ResetPasswordModalProps {
  /** Whether the modal is visible */
  isOpen: boolean
  /** Close the modal */
  onClose: () => void
  /** Notify parent of success (e.g. show banner on auth screen) */
  onSuccess: (message: string) => void
}

/** Eye icon for password visibility toggle */
function VisibilityIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
      </svg>
    )
  }
  return (
    <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-4 .71l2.17 2.17C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15c.94-1.29 1.47-2.85 1.47-4.52 0-2.76-2.24-5-5-5-1.67 0-3.23.53-4.52 1.47l1.9 1.9z" />
    </svg>
  )
}

/**
 * Reset password modal matching the Bonsai auth design.
 * Requires an active recovery session from OTP verification before opening.
 */
export function ResetPasswordModal({ isOpen, onClose, onSuccess }: ResetPasswordModalProps) {
  /* Form state */
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Reset form when modal closes */
  useEffect(() => {
    if (!isOpen) {
      setNewPassword('')
      setConfirmPassword('')
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      setError(null)
      setLoading(false)
    }
  }, [isOpen])

  /* Close on Escape */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  /* Submit: update password via recovery session */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setLoading(true)
      const { error: updateError } = await updatePassword(newPassword)
      if (updateError) throw updateError
      onSuccess('Your password has been updated successfully.')
      onClose()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not reset password. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/25 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="border-outline-variant/20 bg-surface-container-lowest ambient-shadow flex w-full max-w-[440px] flex-col overflow-hidden rounded-xl border p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-password-title"
      >
        {/* Header */}
        <header className="px-8 pt-10 pb-6">
          <h1
            id="reset-password-title"
            className="text-on-surface font-headline mb-2 text-[26px] leading-tight font-bold tracking-tight"
          >
            Reset Password
          </h1>
          <p className="text-on-surface-variant/80 text-[15px] leading-relaxed font-medium">
            Choose a strong password to secure your Bonsai workspace. Aim for at least 8 characters.
          </p>
        </header>

        {/* Form */}
        <div className="px-8 py-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New password */}
            <div className="relative space-y-2">
              <label
                className="text-on-surface-variant/60 block text-[12px] font-medium tracking-widest uppercase"
                htmlFor="reset-new-password"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="reset-new-password"
                  name="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-outline-variant/40 bg-surface-container-low text-on-surface placeholder:text-outline-variant/50 focus:border-primary focus:ring-primary w-full rounded-lg border px-4 py-3.5 transition-all focus:ring-1"
                />
                <button
                  type="button"
                  className="text-outline/60 hover:text-primary absolute top-1/2 right-4 -translate-y-1/2 transition-colors"
                  onClick={() => setShowNewPassword((v) => !v)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  <VisibilityIcon visible={showNewPassword} />
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="relative space-y-2">
              <label
                className="text-on-surface-variant/60 block text-[12px] font-medium tracking-widest uppercase"
                htmlFor="reset-confirm-password"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="reset-confirm-password"
                  name="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-outline-variant/40 bg-surface-container-low text-on-surface placeholder:text-outline-variant/50 focus:border-primary focus:ring-primary w-full rounded-lg border px-4 py-3.5 transition-all focus:ring-1"
                />
                <button
                  type="button"
                  className="text-outline/60 hover:text-primary absolute top-1/2 right-4 -translate-y-1/2 transition-colors"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <VisibilityIcon visible={showConfirmPassword} />
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-error" role="alert">
                {error}
              </p>
            )}

            {/* Actions */}
            <footer className="flex flex-col gap-4 pt-2 pb-6">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-on-primary shadow-primary/10 hover:shadow-primary/20 w-full rounded-xl px-6 py-4 text-[16px] font-bold shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-on-surface-variant/70 hover:text-primary w-full bg-transparent py-2 text-[14px] font-semibold transition-colors"
              >
                Cancel
              </button>
            </footer>
          </form>
        </div>

        {/* Decorative branding strip */}
        <div className="via-primary from-primary/10 to-primary/10 h-1 w-full bg-gradient-to-r opacity-30" />
      </div>
    </div>
  )
}
