/* Auth error helpers: classify Supabase auth errors for UI messaging */

/**
 * Returns true when sign-up failed because the email is already registered.
 */
export function isEmailAlreadyRegistered(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const authError = error as { message?: string; code?: string }
  const message = (authError.message ?? '').toLowerCase()
  return (
    authError.code === 'user_already_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered') ||
    message.includes('user already exists') ||
    message.includes('email address is already') ||
    message.includes('account like this already exists')
  )
}
