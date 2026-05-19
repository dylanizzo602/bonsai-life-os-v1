/* useAccountSettings hook: Manages account profile fields and update actions for the Settings page */
import { useCallback, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  getAuthErrorMessage,
  updateAccountEmail,
  updateAccountPassword,
  updateAccountProfileMetadata,
} from '../../../lib/supabase/account'

interface AccountSettingsState {
  /** First name field value */
  firstName: string
  /** Last name field value */
  lastName: string
  /** Location field value */
  location: string
  /** Location latitude (used for timezone/weather later) */
  locationLat: number | null
  /** Location longitude (used for timezone/weather later) */
  locationLng: number | null
  /** Email field value */
  email: string
  /** Google Calendar ICS URL field value */
  calendarIcsGoogle: string
  /** Microsoft (Outlook) Calendar ICS URL field value */
  calendarIcsMicrosoft: string
  /** Apple Calendar ICS URL field value */
  calendarIcsApple: string
  /** IANA timezone for the profile (empty = use device timezone in the app) */
  timeZone: string
}

/** Profile card fields compared against the last saved baseline for dirty detection */
interface ProfileBaseline {
  firstName: string
  lastName: string
  location: string
  timeZone: string
  email: string
}

interface UseAccountSettingsReturn extends AccountSettingsState {
  /** True when profile card fields differ from the last saved values */
  isProfileDirty: boolean
  /** True while any update request is in flight */
  saving: boolean
  /** Optional error message for the last operation */
  error: string | null
  /** Optional success message for the last operation */
  success: string | null
  /** Reset transient messages (error/success) */
  clearStatus: () => void
  /** Update a single field in local state */
  setField: <K extends keyof AccountSettingsState>(field: K, value: AccountSettingsState[K]) => void
  /** Persist profile metadata fields (first name, last name, location) */
  saveProfile: () => Promise<void>
  /** Persist email change */
  saveEmail: () => Promise<void>
  /** Persist password change */
  savePassword: (newPassword: string) => Promise<void>
}

/**
 * Initialize account settings state from the Supabase user object.
 * Falls back to localStorage for calendar ICS URLs so values persist even if metadata has not refreshed yet.
 */
function getInitialStateFromUser(user: User | null): AccountSettingsState {
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>
  const rawFirstName = typeof metadata.first_name === 'string' ? metadata.first_name : ''
  const rawLastName = typeof metadata.last_name === 'string' ? metadata.last_name : ''
  const rawLocation = typeof metadata.location === 'string' ? metadata.location : ''
  const rawLat = typeof metadata.location_lat === 'number' ? metadata.location_lat : null
  const rawLng = typeof metadata.location_lng === 'number' ? metadata.location_lng : null
  const rawCalendarIcsGoogleMeta =
    typeof metadata.calendar_ics_google === 'string' ? metadata.calendar_ics_google : ''
  const rawCalendarIcsMicrosoftMeta =
    typeof metadata.calendar_ics_microsoft === 'string' ? metadata.calendar_ics_microsoft : ''
  const rawCalendarIcsAppleMeta =
    typeof metadata.calendar_ics_apple === 'string' ? metadata.calendar_ics_apple : ''
  const rawTimeZone = typeof metadata.time_zone === 'string' ? metadata.time_zone : ''

  let rawCalendarIcsGoogle = rawCalendarIcsGoogleMeta
  let rawCalendarIcsMicrosoft = rawCalendarIcsMicrosoftMeta
  let rawCalendarIcsApple = rawCalendarIcsAppleMeta

  if (typeof window !== 'undefined') {
    if (!rawCalendarIcsGoogle) {
      rawCalendarIcsGoogle = window.localStorage.getItem('bonsai_calendar_ics_google') ?? ''
    }
    if (!rawCalendarIcsMicrosoft) {
      rawCalendarIcsMicrosoft = window.localStorage.getItem('bonsai_calendar_ics_microsoft') ?? ''
    }
    if (!rawCalendarIcsApple) {
      rawCalendarIcsApple = window.localStorage.getItem('bonsai_calendar_ics_apple') ?? ''
    }
  }

  return {
    firstName: rawFirstName,
    lastName: rawLastName,
    location: rawLocation,
    locationLat: rawLat,
    locationLng: rawLng,
    email: user?.email ?? '',
    calendarIcsGoogle: rawCalendarIcsGoogle,
    calendarIcsMicrosoft: rawCalendarIcsMicrosoft,
    calendarIcsApple: rawCalendarIcsApple,
    timeZone: rawTimeZone,
  }
}

/** Snapshot of profile card fields used to detect unsaved edits */
function getProfileBaselineFromUser(user: User | null): ProfileBaseline {
  const initial = getInitialStateFromUser(user)
  return {
    firstName: initial.firstName,
    lastName: initial.lastName,
    location: initial.location,
    timeZone: initial.timeZone,
    email: user?.email ?? '',
  }
}

/**
 * Custom hook for managing account settings fields and Supabase update operations.
 * Uses user metadata for first/last name and location, and auth user for email/password.
 */
export function useAccountSettings(user: User | null): UseAccountSettingsReturn {
  /* Local form state: first name, last name, location, email */
  const [state, setState] = useState<AccountSettingsState>(() => getInitialStateFromUser(user))
  /* Last-saved profile card values; updated after successful save */
  const [profileBaseline, setProfileBaseline] = useState<ProfileBaseline>(() =>
    getProfileBaselineFromUser(user),
  )
  /* Status state: saving flag, error and success messages */
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  /* Derived flag: whether there is a logged-in user */
  const hasUser = useMemo(() => !!user, [user])

  /* Dirty check: any profile card field differs from the last saved baseline */
  const isProfileDirty = useMemo(
    () =>
      state.firstName !== profileBaseline.firstName ||
      state.lastName !== profileBaseline.lastName ||
      state.location !== profileBaseline.location ||
      state.timeZone !== profileBaseline.timeZone ||
      state.email.trim() !== profileBaseline.email,
    [
      state.firstName,
      state.lastName,
      state.location,
      state.timeZone,
      state.email,
      profileBaseline,
    ],
  )

  /* Field updater: update a single field in local state */
  const setField = useCallback(
    <K extends keyof AccountSettingsState>(field: K, value: AccountSettingsState[K]) => {
      setState((prev) => ({
        ...prev,
        [field]: value,
      }))
    },
    [],
  )

  /* Status resetter: clear error and success messages */
  const clearStatus = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  /* Metadata saver: persist first name, last name, location, and calendar links to user metadata + localStorage */
  const saveProfile = useCallback(async () => {
    if (!hasUser) return
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      await updateAccountProfileMetadata({
        firstName: state.firstName || null,
        lastName: state.lastName || null,
        location: state.location || null,
        locationLat: state.locationLat,
        locationLng: state.locationLng,
        calendarIcsGoogle: state.calendarIcsGoogle || null,
        calendarIcsMicrosoft: state.calendarIcsMicrosoft || null,
        calendarIcsApple: state.calendarIcsApple || null,
        timeZone: state.timeZone.trim() || null,
      })

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('bonsai_calendar_ics_google', state.calendarIcsGoogle ?? '')
        window.localStorage.setItem(
          'bonsai_calendar_ics_microsoft',
          state.calendarIcsMicrosoft ?? '',
        )
        window.localStorage.setItem('bonsai_calendar_ics_apple', state.calendarIcsApple ?? '')
      }

      setSuccess('Profile updated')
      setProfileBaseline((prev) => ({
        ...prev,
        firstName: state.firstName,
        lastName: state.lastName,
        location: state.location,
        timeZone: state.timeZone,
      }))
    } catch (err) {
      const message = getAuthErrorMessage(err, 'Failed to update profile')
      setError(message)
    } finally {
      setSaving(false)
    }
  }, [
    hasUser,
    state.firstName,
    state.lastName,
    state.location,
    state.locationLat,
    state.locationLng,
    state.calendarIcsGoogle,
    state.calendarIcsMicrosoft,
    state.calendarIcsApple,
    state.timeZone,
  ])

  /* Email saver: persist email change using Supabase auth updateUser */
  const saveEmail = useCallback(async () => {
    if (!hasUser) return
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const trimmedEmail = state.email.trim()
      if (!trimmedEmail) {
        setError('Email cannot be empty')
        return
      }

      await updateAccountEmail(trimmedEmail)

      setSuccess('Email update requested. Check your inbox to confirm.')
      setProfileBaseline((prev) => ({
        ...prev,
        email: trimmedEmail,
      }))
    } catch (err) {
      const message = getAuthErrorMessage(err, 'Failed to update email')
      setError(message)
    } finally {
      setSaving(false)
    }
  }, [hasUser, state.email])

  /* Password saver: persist a new password value */
  const savePassword = useCallback(
    async (newPassword: string) => {
      if (!hasUser) return
      try {
        setSaving(true)
        setError(null)
        setSuccess(null)

        const trimmed = newPassword.trim()
        if (!trimmed) {
          setError('Password cannot be empty')
          return
        }

        await updateAccountPassword(trimmed)

        setSuccess('Password updated')
      } catch (err) {
        const message = getAuthErrorMessage(err, 'Failed to update password')
        setError(message)
      } finally {
        setSaving(false)
      }
    },
    [hasUser],
  )

  return {
    ...state,
    isProfileDirty,
    saving,
    error,
    success,
    clearStatus,
    setField,
    saveProfile,
    saveEmail,
    savePassword,
  }
}

