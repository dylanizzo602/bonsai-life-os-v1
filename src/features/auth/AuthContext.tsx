/* Auth context: Provides Supabase user/session state and auth actions to the app */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  getSession,
  signInWithEmail,
  signUpWithEmail,
  signOut as supabaseSignOut,
  onAuthStateChange,
} from '../../lib/supabase/auth'

interface AuthContextValue {
  /** Current authenticated user (null if signed out) */
  user: User | null
  /** Current session (null if signed out) */
  session: Session | null
  /** True while initial auth state is loading */
  loading: boolean
  /** Sign in with email/password */
  signIn: (email: string, password: string) => Promise<void>
  /** Sign up with email/password */
  signUp: (email: string, password: string) => Promise<void>
  /** Sign out current user */
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  /** Children that should have access to auth state */
  children: ReactNode
}

/**
 * AuthProvider: Wraps the app and exposes Supabase auth state and actions.
 * Handles initial session load and listens for auth state changes.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  /* Auth state: user, session, loading */
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  /* Initial session load: fetch current session on mount */
  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const currentSession = await getSession()
        if (!isMounted) return
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
      } finally {
        if (isMounted) setLoading(false)
      }
    })()

    /* Subscribe to auth state changes */
    const unsubscribe = onAuthStateChange((nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  /* Sign in handler: email/password */
  const handleSignIn = useCallback(async (email: string, password: string) => {
    const { error } = await signInWithEmail({ email, password })
    if (error) {
      throw error
    }
  }, [])

  /* Sign up handler: email/password */
  const handleSignUp = useCallback(async (email: string, password: string) => {
    const { error } = await signUpWithEmail({ email, password })
    if (error) {
      throw error
    }
  }, [])

  /* Sign out handler */
  const handleSignOut = useCallback(async () => {
    const error = await supabaseSignOut()
    if (error) {
      throw error
    }
  }, [])

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth hook: Access auth state and actions from anywhere in the app.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

