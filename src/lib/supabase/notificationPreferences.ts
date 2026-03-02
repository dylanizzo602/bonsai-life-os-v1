/* Notification preferences data access layer: CRUD helpers for per-user notification type/channel toggles */
import { supabase } from './client'
import type {
  NotificationType,
  NotificationChannel,
  UserNotificationPreference,
  EffectiveNotificationPreferences,
} from '../notifications/types'

/* Default preference: when no explicit row exists, treat notifications as enabled for all types/channels */
const DEFAULT_ENABLED = true

/* Fetch all notification preferences for the current authenticated user */
export async function getNotificationPreferences(): Promise<UserNotificationPreference[]> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .order('type', { ascending: true })
    .order('channel', { ascending: true })

  if (error) {
    console.error('Error fetching notification preferences:', error)
    throw error
  }

  return (data ?? []) as UserNotificationPreference[]
}

/* Update or insert a single notification preference row for the current user */
export async function upsertNotificationPreference(
  type: NotificationType,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<UserNotificationPreference> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .upsert(
      {
        type,
        channel,
        enabled,
      },
      { onConflict: 'user_id,type,channel' },
    )
    .select()
    .single()

  if (error) {
    console.error('Error upserting notification preference:', error)
    throw error
  }

  return data as UserNotificationPreference
}

/* Convert a flat list of user preferences into a nested map keyed by type and channel */
export function buildEffectivePreferencesMap(
  rows: UserNotificationPreference[],
): EffectiveNotificationPreferences {
  const map: EffectiveNotificationPreferences = {}
  for (const row of rows) {
    if (!map[row.type]) {
      map[row.type] = {}
    }
    map[row.type]![row.channel] = row.enabled
  }
  return map
}

/* Compute whether a given type/channel is enabled, defaulting to true when no explicit preference exists */
export function isNotificationEnabled(
  prefsMap: EffectiveNotificationPreferences,
  type: NotificationType,
  channel: NotificationChannel,
): boolean {
  const typePrefs = prefsMap[type]
  if (!typePrefs || typeof typePrefs[channel] === 'undefined') {
    return DEFAULT_ENABLED
  }
  return Boolean(typePrefs[channel])
}

