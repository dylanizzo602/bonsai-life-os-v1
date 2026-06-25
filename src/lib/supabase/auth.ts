/* Auth helpers: thin wrappers around Supabase auth client for session and email/password flows */
import type {
  AuthChangeEvent,
  AuthError,
  Session,
  User,
  AuthResponse,
} from '@supabase/supabase-js'
import { supabase } from './client'
import { clearQueryCache } from './queryCache'

/* Get the current auth session (if any) */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error getting session:', error)
    throw error
  }
  return data.session
}

/* Sign in with email and password */
export async function signInWithEmail({
  email,
  password,
}: {
  email: string
  password: string
}): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> {
  const { data, error }: AuthResponse = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) {
    console.error('Error signing in:', error)
    return { user: null, session: null, error }
  }
  return { user: data.user, session: data.session, error: null }
}

/* Sign up with email and password */
export async function signUpWithEmail({
  email,
  password,
}: {
  email: string
  password: string
}): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> {
  const { data, error }: AuthResponse = await supabase.auth.signUp({
    email,
    password,
  })
  if (error) {
    console.error('Error signing up:', error)
    return { user: null, session: null, error }
  }
  /* Supabase may return no error but empty identities when email already exists */
  if (data.user && data.user.identities?.length === 0) {
    const duplicateError = {
      message: 'User already registered',
      name: 'AuthApiError',
      status: 422,
    } as AuthError
    return { user: null, session: null, error: duplicateError }
  }
  return { user: data.user, session: data.session, error: null }
}

/* Send password reset email with link back to this app */
export async function sendPasswordResetEmail(
  email: string,
): Promise<{ error: AuthError | null }> {
  const redirectTo = `${window.location.origin}${window.location.pathname}`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) {
    console.error('Error sending password reset email:', error)
    return { error }
  }
  return { error: null }
}

/* Set a new password (requires active session, e.g. after recovery link) */
export async function updatePassword(
  password: string,
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    console.error('Error updating password:', error)
    return { error }
  }
  return { error: null }
}

/* Sign in with Google OAuth (redirects the browser to Google consent) */
export async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
  const redirectTo = `${window.location.origin}${window.location.pathname}`
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
  if (error) {
    console.error('Error signing in with Google:', error)
    return { error }
  }
  return { error: null }
}

/* Sign out the current user */
export async function signOut(): Promise<AuthError | null> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error signing out:', error)
    return error
  }
  /* Clear read cache so the next user never sees stale data */
  clearQueryCache()
  return null
}

/* Subscribe to auth state changes */
export function onAuthStateChange(
  callback: (session: Session | null, event: AuthChangeEvent) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session, event)
  })
  return () => {
    data.subscription.unsubscribe()
  }
}

