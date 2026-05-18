/* Sign-up error modal: Email already registered */
import { useEffect } from 'react'

interface SignUpExistsErrorModalProps {
  /** Whether the modal is visible */
  isOpen: boolean
  /** Close the modal (stay on sign-up) */
  onClose: () => void
  /** Navigate back to the login screen */
  onSignIn: () => void
}

/** Warning icon for duplicate account */
function WarningIcon() {
  return (
    <svg className="text-error h-8 w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  )
}

/**
 * Shown when sign-up is attempted with an email that already has an account.
 */
export function SignUpExistsErrorModal({ isOpen, onClose, onSignIn }: SignUpExistsErrorModalProps) {
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
        aria-labelledby="signup-exists-title"
        aria-describedby="signup-exists-description"
      >
        <div className="flex flex-col items-center text-center">
          {/* Error icon */}
          <div className="bg-error-container/30 mb-6 flex h-16 w-16 items-center justify-center rounded-full">
            <WarningIcon />
          </div>

          {/* Message */}
          <h2
            id="signup-exists-title"
            className="text-on-surface font-headline mb-3 text-xl font-bold"
          >
            Account Already Exists
          </h2>
          <p
            id="signup-exists-description"
            className="text-on-surface-variant font-body mb-8 text-sm leading-relaxed"
          >
            An account like this already exists with that email address. Sign in to your
            workspace or try a different email.
          </p>

          {/* Actions */}
          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={onSignIn}
              className="w-full rounded-lg py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 active:scale-[0.98]"
              style={{ backgroundColor: '#7D8C7C' }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-primary hover:bg-primary/5 w-full rounded-lg py-3 text-sm font-semibold transition-all duration-200"
            >
              Try a Different Email
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
