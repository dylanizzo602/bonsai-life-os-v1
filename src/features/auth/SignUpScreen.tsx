/* Sign-up screen: Create account form matching Bonsai auth design */
import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { GoogleIcon } from './components/GoogleIcon'
import { VisibilityIcon } from './components/VisibilityIcon'
import { isEmailAlreadyRegistered } from './utils/authErrors'

interface SignUpScreenProps {
  /** Pre-fill email from the login form */
  initialEmail?: string
  /** Return to the login screen */
  onSwitchToSignIn: () => void
  /** Show modal when email is already registered */
  onEmailAlreadyExists: () => void
  /** Successful sign-up (e.g. email confirmation message on login) */
  onSignUpSuccess: (message: string) => void
}

/**
 * Dedicated create-account screen with email, password, confirm password, and Google SSO placeholder.
 */
export function SignUpScreen({
  initialEmail = '',
  onSwitchToSignIn,
  onEmailAlreadyExists,
  onSignUpSuccess,
}: SignUpScreenProps) {
  /* Form state */
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { signUp } = useAuth()

  /* Sync pre-filled email when navigating from login */
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail)
    }
  }, [initialEmail])

  /* Submit: create account */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    try {
      setLoading(true)
      await signUp(email.trim(), password)
      onSignUpSuccess(
        'Sign-up successful. If email confirmation is required, please check your inbox before signing in.',
      )
      onSwitchToSignIn()
    } catch (err) {
      if (isEmailAlreadyRegistered(err)) {
        onEmailAlreadyExists()
        setError(null)
      } else {
        const message =
          err instanceof Error ? err.message : 'Could not create account. Please try again.'
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-[440px] flex-col items-center">
        {/* Brand identity */}
        <div className="mb-6 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <img src="/bonsai-logo.png" alt="Bonsai Productivity" className="h-10 w-auto" />
            <span
              className="font-headline text-2xl font-semibold tracking-tight"
              style={{ color: '#7D8C7C' }}
            >
              Bonsai
            </span>
          </div>
          <h1 className="font-headline text-on-surface mb-1 text-xl leading-tight font-semibold tracking-tight">
            Create your Bonsai account.
          </h1>
          <p className="text-on-surface-variant font-body text-sm">
            Start your journey of slow productivity.
          </p>
        </div>

        {/* Sign-up form card */}
        <div className="border-outline-variant/30 bg-surface-container-lowest w-full rounded-xl border p-6 transition-all duration-500 ease-in-out">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div className="flex flex-col space-y-1">
              <label
                className="text-outline font-label text-[10px] font-bold tracking-widest uppercase"
                htmlFor="signup-email"
              >
                Email Address
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="zenith-input text-on-surface placeholder:text-outline-variant/60 border-outline-variant w-full border-t-0 border-r-0 border-b border-l-0 bg-transparent px-1 py-2 transition-all duration-300 focus:ring-0"
              />
            </div>

            {/* Password field */}
            <div className="flex flex-col space-y-1">
              <label
                className="text-outline font-label text-[10px] font-bold tracking-widest uppercase"
                htmlFor="signup-password"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-outline-variant/40 bg-surface-container-low text-on-surface placeholder:text-outline-variant/50 focus:border-primary focus:ring-primary w-full rounded-lg border px-4 py-3.5 pr-12 transition-all focus:ring-1"
                />
                <button
                  type="button"
                  className="text-outline/60 hover:text-primary absolute top-1/2 right-4 -translate-y-1/2 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <VisibilityIcon visible={showPassword} />
                </button>
              </div>
            </div>

            {/* Confirm password field */}
            <div className="flex flex-col space-y-1">
              <label
                className="text-outline font-label text-[10px] font-bold tracking-widest uppercase"
                htmlFor="signup-confirm-password"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="signup-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-outline-variant/40 bg-surface-container-low text-on-surface placeholder:text-outline-variant/50 focus:border-primary focus:ring-primary w-full rounded-lg border px-4 py-3.5 pr-12 transition-all focus:ring-1"
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

            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-on-primary hover:bg-primary-container w-full rounded-lg py-3 text-sm font-semibold shadow-sm transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* SSO section (not yet wired) */}
          <div className="mt-6">
            <div className="relative mb-4 flex items-center">
              <div className="border-outline-variant/30 flex-grow border-t" />
              <span className="text-on-surface-variant mx-4 flex-shrink text-xs">
                Or sign in with
              </span>
              <div className="border-outline-variant/30 flex-grow border-t" />
            </div>
            <button
              type="button"
              className="border-outline-variant/40 bg-surface-container-low hover:bg-surface-container flex w-full items-center justify-center gap-2 rounded-lg border py-3 transition-colors duration-200"
              aria-label="Sign up with Google (not yet available)"
            >
              <GoogleIcon />
              <span className="text-on-surface text-sm font-medium">Google</span>
            </button>
          </div>
        </div>

        {/* Sign-in footnote */}
        <div className="mt-6 text-center">
          <p className="text-on-surface-variant font-body text-sm">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="text-primary font-semibold underline-offset-4 transition-all hover:underline"
            >
              Sign in.
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}
