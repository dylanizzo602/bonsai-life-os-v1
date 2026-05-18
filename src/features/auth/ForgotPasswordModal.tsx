/* Forgot password modal: Request reset link by email */
import { useEffect, useState } from 'react'
import { sendPasswordResetEmail } from '../../lib/supabase/auth'

interface ForgotPasswordModalProps {
  /** Whether the modal is visible */
  isOpen: boolean
  /** Close the modal */
  onClose: () => void
  /** Pre-fill email from the sign-in form */
  initialEmail?: string
  /** Notify parent after reset email is sent */
  onSuccess: (message: string) => void
}

/**
 * Collects email and sends a Supabase password reset link.
 * User sets a new password after clicking the link in their email.
 */
export function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = '',
  onSuccess,
}: ForgotPasswordModalProps) {
  /* Form state */
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Sync pre-filled email when modal opens */
  useEffect(() => {
    if (isOpen && initialEmail) {
      setEmail(initialEmail)
    }
  }, [isOpen, initialEmail])

  /* Reset form when closed */
  useEffect(() => {
    if (!isOpen) {
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

  /* Send password reset link */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Please enter your email address.')
      return
    }

    try {
      setLoading(true)
      const { error: sendError } = await sendPasswordResetEmail(trimmedEmail)
      if (sendError) throw sendError
      onSuccess(
        `We sent a password reset link to ${trimmedEmail}. Open the link in your email to set a new password.`,
      )
      onClose()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not send reset email. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="bg-on-surface/20 fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="border-outline-variant/20 bg-surface-container-lowest ambient-shadow flex w-full max-w-[440px] flex-col overflow-hidden rounded-xl border p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
      >
        <header className="px-8 pt-10 pb-6">
          <h1
            id="forgot-password-title"
            className="text-on-surface font-headline mb-2 text-[26px] leading-tight font-bold tracking-tight"
          >
            Forgot Password
          </h1>
          <p className="text-on-surface-variant/80 text-[15px] leading-relaxed font-medium">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </header>

        <div className="px-8 py-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                className="text-on-surface-variant/60 block text-[12px] font-medium tracking-widest uppercase"
                htmlFor="forgot-email"
              >
                Email Address
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="border-outline-variant/40 bg-surface-container-low text-on-surface placeholder:text-outline-variant/50 focus:border-primary focus:ring-primary w-full rounded-lg border px-4 py-3.5 transition-all focus:ring-1"
              />
            </div>

            {error && (
              <p className="text-sm text-error" role="alert">
                {error}
              </p>
            )}

            <footer className="flex flex-col gap-4 pt-2 pb-6">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-on-primary shadow-primary/10 hover:shadow-primary/20 w-full rounded-xl px-6 py-4 text-[16px] font-bold shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
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

        <div className="via-primary from-primary/10 to-primary/10 h-1 w-full bg-gradient-to-r opacity-30" />
      </div>
    </div>
  )
}
