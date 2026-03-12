/* Account data access layer: Supabase auth updates for profile metadata, email, and password */
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from './client'

interface UpdateAccountProfileInput {
  /** First name stored in user metadata */
  firstName: string | null
  /** Last name stored in user metadata */
  lastName: string | null
  /** Location display string stored in user metadata */
  location: string | null
  /** Location latitude stored in user metadata */
  locationLat: number | null
  /** Location longitude stored in user metadata */
  locationLng: number | null
  /** Google Calendar ICS URL stored in user metadata */
  calendarIcsGoogle: string | null
  /** Microsoft (Outlook) Calendar ICS URL stored in user metadata */
  calendarIcsMicrosoft: string | null
  /** Apple Calendar ICS URL stored in user metadata */
  calendarIcsApple: string | null
}

/**
 * Update account profile metadata (name + location) in Supabase auth user metadata.
 */
export async function updateAccountProfileMetadata(input: UpdateAccountProfileInput): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: {
      first_name: input.firstName,
      last_name: input.lastName,
      location: input.location,
      location_lat: input.locationLat,
      location_lng: input.locationLng,
      calendar_ics_google: input.calendarIcsGoogle,
      calendar_ics_microsoft: input.calendarIcsMicrosoft,
      calendar_ics_apple: input.calendarIcsApple,
    },
  })

  if (error) {
    console.error('Error updating account profile metadata:', error)
    throw error
  }
}

/**
 * Request an email address change for the current user.
 * Supabase may require the user to confirm the new email via an inbox link.
 */
export async function updateAccountEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email })

  if (error) {
    console.error('Error updating account email:', error)
    throw error
  }
}

/**
 * Update the current user's password.
 */
export async function updateAccountPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('Error updating account password:', error)
    throw error
  }
}

/**
 * Type guard helper: normalize unknown errors into an AuthError-like message.
 */
export function getAuthErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback
  if (typeof err === 'string') return err
  const maybe = err as Partial<AuthError>
  if (typeof maybe.message === 'string' && maybe.message.trim()) return maybe.message
  if (err instanceof Error && err.message.trim()) return err.message
  return fallback
}

