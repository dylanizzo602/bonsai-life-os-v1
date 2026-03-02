/* Notification settings hook: manage user notification preferences for types and channels in settings UI */
import { useEffect, useMemo, useState } from 'react'
import {
  getNotificationPreferences,
  upsertNotificationPreference,
  buildEffectivePreferencesMap,
} from '../../../lib/supabase/notificationPreferences'
import type { NotificationType, NotificationChannel } from '../../../lib/notifications/types'

/* Ordered list of notification types shown in the settings UI */
const NOTIFICATION_TYPES: NotificationType[] = ['task_overdue', 'reminder_due', 'habit_reminder_due']

/* Ordered list of channels shown in the settings UI */
const CHANNELS: NotificationChannel[] = ['email', 'push_web', 'push_mobile']

interface UseNotificationSettingsState {
  /** Whether preferences are currently loading from Supabase */
  loading: boolean
  /** Whether a save is currently in progress */
  saving: boolean
  /** Optional latest error message */
  error: string | null
  /** Convenience: list of types to display */
  types: NotificationType[]
  /** Convenience: list of channels to display */
  channels: NotificationChannel[]
  /** Check if a given type/channel is enabled (defaults to true when unset) */
  isEnabled: (type: NotificationType, channel: NotificationChannel) => boolean
  /** Toggle a specific preference on or off and persist to Supabase */
  togglePreference: (type: NotificationType, channel: NotificationChannel) => Promise<void>
}

/**
 * Hook for managing notification preferences in the settings page.
 * Loads current preferences, exposes helpers to check enabled state, and persists updates.
 */
export function useNotificationSettings(): UseNotificationSettingsState {
  /* Local loading/saving/error state for preferences lifecycle */
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawPrefs, setRawPrefs] = useState<
    { type: NotificationType; channel: NotificationChannel; enabled: boolean }[]
  >([])

  /* Derived map of effective preferences keyed by type and channel */
  const prefsMap = useMemo(() => buildEffectivePreferencesMap(rawPrefs as any), [rawPrefs])

  /* Helper: determine if a type/channel is enabled, defaulting to true when not explicitly set */
  const isEnabled = (type: NotificationType, channel: NotificationChannel): boolean => {
    const typePrefs = prefsMap[type]
    if (!typePrefs || typeof typePrefs[channel] === 'undefined') {
      return true
    }
    return Boolean(typePrefs[channel])
  }

  /* Initial load: fetch preferences when hook mounts */
  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const prefs = await getNotificationPreferences()
        if (!isMounted) return
        setRawPrefs(
          prefs.map((p) => ({
            type: p.type as NotificationType,
            channel: p.channel as NotificationChannel,
            enabled: p.enabled,
          })),
        )
      } catch (err) {
        console.error('Error loading notification settings:', err)
        if (isMounted) {
          setError('Unable to load notification preferences right now.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [])

  /* Toggle handler: flip local state and persist change to Supabase */
  const togglePreference = async (type: NotificationType, channel: NotificationChannel) => {
    setSaving(true)
    setError(null)
    try {
      const current = isEnabled(type, channel)
      const nextEnabled = !current
      await upsertNotificationPreference(type, channel, nextEnabled)
      setRawPrefs((prev) => {
        const existingIndex = prev.findIndex((p) => p.type === type && p.channel === channel)
        if (existingIndex === -1) {
          return [...prev, { type, channel, enabled: nextEnabled }]
        }
        const next = [...prev]
        next[existingIndex] = { ...next[existingIndex], enabled: nextEnabled }
        return next
      })
    } catch (err) {
      console.error('Error updating notification preference:', err)
      setError('Unable to update notification preference. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return {
    loading,
    saving,
    error,
    types: NOTIFICATION_TYPES,
    channels: CHANNELS,
    isEnabled,
    togglePreference,
  }
}

