/* Login error modal: Shown when sign-in attempt fails */
import { useEffect } from 'react'

interface LoginErrorModalProps {
  /** Whether the modal is visible */
  isOpen: boolean
  /** Close the modal (Try Again) */
  onClose: () => void
  /** Switch to sign-up mode */
  onCreateAccount: () => void
}

/** Warning icon for failed login */
function WarningIcon() {
  return (
    <svg className="text-error h-8 w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  )
}

/**
 * Login error modal shown when credentials do not match an account.
 * Matches the Bonsai auth "Account Not Found" design.
 */
export function LoginErrorModal({ isOpen, onClose, onCreateAccount }: LoginErrorModalProps) {
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

  if (!isOpen) return null

  return (
    <div
      className="bg-on-surface/20 fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="border-outline-variant/30 bg-surface-container-lowest w-full max-w-[400px] rounded-xl border p-8 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="login-error-title"
        aria-describedby="login-error-description"
      >
        <div className="flex flex-col items-center text-center">
          {/* Error icon */}
          <div className="bg-error-container/30 mb-6 flex h-16 w-16 items-center justify-center rounded-full">
            <WarningIcon />
          </div>

          {/* Message */}
          <h2
            id="login-error-title"
            className="text-on-surface font-headline mb-3 text-xl font-bold"
          >
            Account Not Found
          </h2>
          <p
            id="login-error-description"
            className="text-on-surface-variant font-body mb-8 text-sm leading-relaxed"
          >
            We couldn&apos;t find an account with those details. Please check your information and
            try again, or create a new account to begin your journey.
          </p>

          {/* Actions */}
          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 active:scale-[0.98]"
              style={{ backgroundColor: '#7D8C7C' }}
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={onCreateAccount}
              className="text-primary hover:bg-primary/5 w-full rounded-lg py-3 text-sm font-semibold transition-all duration-200"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
