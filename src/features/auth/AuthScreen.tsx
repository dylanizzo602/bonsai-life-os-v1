/* Auth screen: Email/password sign-in and sign-up routing */
import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { GoogleIcon } from './components/GoogleIcon'
import { ForgotPasswordModal } from './ForgotPasswordModal'
import { LoginErrorModal } from './LoginErrorModal'
import { ResetPasswordModal } from './ResetPasswordModal'
import { SignUpExistsErrorModal } from './SignUpExistsErrorModal'
import { SignUpScreen } from './SignUpScreen'
import { AppFooter } from '../../components/AppFooter'

type AuthMode = 'signin' | 'signup'

/**
 * AuthScreen component
 * Hosts login, sign-up, and auth-related modals.
 */
export function AuthScreen() {
  /* Local form state: mode, fields, loading, and messages */
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [forgotModalOpen, setForgotModalOpen] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [loginErrorModalOpen, setLoginErrorModalOpen] = useState(false)
  const [signUpExistsModalOpen, setSignUpExistsModalOpen] = useState(false)

  const { signIn, signInWithGoogle, isPasswordRecovery, clearPasswordRecovery, signOut } = useAuth()

  /* Open reset modal when user returns from password reset email link */
  useEffect(() => {
    if (isPasswordRecovery) {
      setResetModalOpen(true)
    }
  }, [isPasswordRecovery])

  /* Surface expired/invalid reset links from URL hash and clean the address bar */
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('error=')) return

    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
    const description = params.get('error_description')?.replace(/\+/g, ' ')
    if (description) {
      setInfoMessage(decodeURIComponent(description))
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])

  /* Handle sign-in form submission */
  const handleSignInSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setInfoMessage(null)

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    try {
      setLoading(true)
      await signIn(email, password)
    } catch {
      setLoginErrorModalOpen(true)
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  /* Handle Google OAuth sign-in */
  const handleGoogleSignIn = async () => {
    setError(null)
    setInfoMessage(null)
    try {
      setLoading(true)
      await signInWithGoogle()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not sign in with Google. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  /* Switch auth mode and clear transient messages */
  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
    setInfoMessage(null)
  }

  const goToSignIn = () => {
    switchMode('signin')
    setSignUpExistsModalOpen(false)
  }

  return (
    <div className="bg-surface text-on-surface flex min-h-screen flex-col font-body antialiased">
      {/* Background decorative blurs */}
      <div
        className="pointer-events-none fixed top-0 left-0 -z-10 h-full w-full overflow-hidden"
        aria-hidden
      >
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[60%] -right-[5%] h-[30%] w-[30%] rounded-full bg-secondary/5 blur-[100px]" />
      </div>

      {mode === 'signup' ? (
        <SignUpScreen
          initialEmail={email}
          onSwitchToSignIn={goToSignIn}
          onEmailAlreadyExists={() => setSignUpExistsModalOpen(true)}
          onSignUpSuccess={(message) => {
            setInfoMessage(message)
            setPassword('')
          }}
        />
      ) : (
        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="flex w-full max-w-[440px] flex-col items-center">
            {/* Brand identity */}
            <div className="mb-6 text-center">
              <div className="mb-4 flex items-center justify-center gap-3">
                <img
                  src="/bonsai-logo.png"
                  alt="Bonsai Productivity"
                  className="h-10 w-auto"
                />
                <span
                  className="font-headline text-2xl font-semibold tracking-tight"
                  style={{ color: '#7D8C7C' }}
                >
                  Bonsai
                </span>
              </div>
              <h1 className="font-headline text-on-surface mb-1 text-xl leading-tight font-semibold tracking-tight">
                Welcome back to your workspace.
              </h1>
              <p className="text-on-surface-variant font-body text-sm">
                Continue your journey of slow productivity.
              </p>
            </div>

            {/* Sign-in form card */}
            <div className="border-outline-variant/30 bg-surface-container-lowest w-full rounded-xl border p-6 transition-all duration-500 ease-in-out">
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div className="flex flex-col space-y-1">
                  <label
                    className="text-outline font-label text-[10px] font-bold tracking-widest uppercase"
                    htmlFor="auth-email"
                  >
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="bonsai-input text-on-surface placeholder:text-outline-variant/60 border-outline-variant w-full border-t-0 border-r-0 border-b border-l-0 bg-transparent px-1 py-2 transition-all duration-300 focus:ring-0"
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      className="text-outline font-label text-[10px] font-bold tracking-widest uppercase"
                      htmlFor="auth-password"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-primary hover:text-primary-container text-sm transition-colors duration-200"
                      onClick={() => {
                        setError(null)
                        setForgotModalOpen(true)
                      }}
                    >
                      Forgot?
                    </button>
                  </div>
                  <input
                    id="auth-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bonsai-input text-on-surface placeholder:text-outline-variant/60 border-outline-variant w-full border-t-0 border-r-0 border-b border-l-0 bg-transparent px-1 py-2 transition-all duration-300 focus:ring-0"
                  />
                </div>

                {error && (
                  <p className="text-sm text-error" role="alert">
                    {error}
                  </p>
                )}
                {infoMessage && (
                  <p className="text-primary text-sm" role="status">
                    {infoMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-on-primary hover:bg-primary-container w-full rounded-lg py-3 text-sm font-semibold shadow-sm transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

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
                  disabled={loading}
                  onClick={() => void handleGoogleSignIn()}
                  className="border-outline-variant/40 bg-surface-container-low hover:bg-surface-container flex w-full items-center justify-center gap-2 rounded-lg border py-3 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Sign in with Google"
                >
                  <GoogleIcon />
                  <span className="text-on-surface text-sm font-medium">Google</span>
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-on-surface-variant font-body text-sm">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-primary font-semibold underline-offset-4 transition-all hover:underline"
                >
                  Start your journey.
                </button>
              </p>
            </div>
          </div>
        </main>
      )}

      <AppFooter />

      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        initialEmail={email}
        onSuccess={(message) => {
          setInfoMessage(message)
          setError(null)
        }}
      />

      <ResetPasswordModal
        isOpen={resetModalOpen}
        onClose={async () => {
          setResetModalOpen(false)
          if (isPasswordRecovery) {
            clearPasswordRecovery()
            await signOut()
          }
        }}
        onSuccess={(message) => {
          setInfoMessage(message)
          setError(null)
          clearPasswordRecovery()
        }}
      />

      <LoginErrorModal
        isOpen={loginErrorModalOpen}
        onClose={() => setLoginErrorModalOpen(false)}
        onCreateAccount={() => {
          setLoginErrorModalOpen(false)
          switchMode('signup')
        }}
      />

      <SignUpExistsErrorModal
        isOpen={signUpExistsModalOpen}
        onClose={() => setSignUpExistsModalOpen(false)}
        onSignIn={goToSignIn}
      />
    </div>
  )
}
