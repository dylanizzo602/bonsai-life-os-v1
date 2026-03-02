/* Auth screen: Email/password sign-in and sign-up UI */
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useAuth } from './AuthContext'

type AuthMode = 'signin' | 'signup'

/**
 * AuthScreen component
 * Allows users to sign in or sign up with email and password.
 */
export function AuthScreen() {
  /* Local form state: mode, fields, loading, and error message */
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  const { signIn, signUp } = useAuth()

  /* Handle form submission for sign-in or sign-up */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setInfoMessage(null)

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setLoading(true)
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setInfoMessage(
          'Sign-up successful. If email confirmation is required, please check your inbox before signing in.',
        )
        setMode('signin')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Authentication failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bonsai-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-bonsai-slate-200 p-6 md:p-8">
        {/* Header: App name and mode toggle */}
        <div className="mb-6 text-center">
          <h1 className="text-page-title font-bold text-bonsai-brown-700 mb-1">
            Bonsai Life OS
          </h1>
          <p className="text-secondary text-bonsai-slate-600">
            {mode === 'signin'
              ? 'Sign in to your workspace'
              : 'Create an account to get started'}
          </p>
        </div>

        {/* Mode toggle buttons */}
        <div className="flex mb-6 rounded-lg bg-bonsai-slate-100 p-1">
          <button
            type="button"
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'signin'
                ? 'bg-white text-bonsai-brown-700 shadow-sm'
                : 'text-bonsai-slate-600 hover:text-bonsai-brown-700'
            }`}
            onClick={() => setMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'signup'
                ? 'bg-white text-bonsai-brown-700 shadow-sm'
                : 'text-bonsai-slate-600 hover:text-bonsai-brown-700'
            }`}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
          />
          {mode === 'signup' && (
            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          )}

          {error && (
            <p className="text-secondary text-red-600" role="alert">
              {error}
            </p>
          )}
          {infoMessage && (
            <p className="text-secondary text-bonsai-sage-700" role="status">
              {infoMessage}
            </p>
          )}

          <Button
            type="submit"
            className="w-full mt-2"
            disabled={loading}
          >
            {loading
              ? mode === 'signin'
                ? 'Signing in...'
                : 'Creating account...'
              : mode === 'signin'
                ? 'Sign in'
                : 'Sign up'}
          </Button>
        </form>
      </div>
    </div>
  )
}

