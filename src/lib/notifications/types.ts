/* Notification type definitions: enums for notification kinds and channels shared across app and backend */
export type NotificationType =
  | 'task_overdue'
  | 'task_due_soon'
  | 'reminder_due'
  | 'habit_reminder_due'
  | 'morning_briefing_incomplete_noon'

/* Notification channel definitions: supported delivery channels for each notification */
export type NotificationChannel = 'email' | 'push_web' | 'push_mobile'

/* Helper: structured shape for a single user notification preference row */
export interface UserNotificationPreference {
  /** Owner user id for this preference (matches Supabase auth uid) */
  user_id: string
  /** Logical notification type this preference controls */
  type: NotificationType
  /** Delivery channel controlled by this preference */
  channel: NotificationChannel
  /** Whether this notification type/channel is enabled for the user */
  enabled: boolean
}

/* Helper: convenience map of effective preferences keyed by type and channel */
export type EffectiveNotificationPreferences = {
  /** Map of notification type -> channel -> enabled flag for the current user */
  [T in NotificationType]?: Partial<Record<NotificationChannel, boolean>>
}

