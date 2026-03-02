/* Auth helpers: thin wrappers around Supabase auth client for session and email/password flows */
import type {
  AuthError,
  Session,
  User,
  AuthResponse,
} from '@supabase/supabase-js'
import { supabase } from './client'

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
  return { user: data.user, session: data.session, error: null }
}

/* Sign out the current user */
export async function signOut(): Promise<AuthError | null> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error signing out:', error)
    return error
  }
  return null
}

/* Subscribe to auth state changes */
export function onAuthStateChange(
  callback: (session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => {
    data.subscription.unsubscribe()
  }
}

