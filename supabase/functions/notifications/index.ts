/* Notifications edge function: scan overdue tasks and due reminders/habit reminders and send mobile push notifications */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type NotificationType = 'task_overdue' | 'reminder_due' | 'habit_reminder_due'
type NotificationChannel = 'push_mobile'

interface UserNotificationPreferenceRow {
  user_id: string
  type: NotificationType
  channel: NotificationChannel
  enabled: boolean
}

interface EffectivePreferences {
  [type: string]: Partial<Record<NotificationChannel, boolean>>
}

/* Build a Supabase client using service role credentials for cross-table access */
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  return createClient(url, key, { auth: { persistSession: false } })
}

/* Convert a flat list of preference rows into a nested type/channel map */
function buildPreferencesMap(rows: UserNotificationPreferenceRow[]): EffectivePreferences {
  const map: EffectivePreferences = {}
  for (const row of rows) {
    if (!map[row.type]) {
      map[row.type] = {}
    }
    map[row.type]![row.channel] = row.enabled
  }
  return map
}

/* Check if a given notification type/channel is enabled, defaulting to true when unset */
function isEnabled(
  prefs: EffectivePreferences,
  type: NotificationType,
  channel: NotificationChannel,
): boolean {
  const byType = prefs[type]
  if (!byType || typeof byType[channel] === 'undefined') {
    return true
  }
  return Boolean(byType[channel])
}

/* Fetch user preferences and build an in-memory map keyed by user id */
async function loadPreferencesByUserIds(
  supabase: ReturnType<typeof getServiceClient>,
  userIds: string[],
): Promise<Record<string, EffectivePreferences>> {
  if (userIds.length === 0) return {}
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .in('user_id', userIds)

  if (error) {
    console.error('Error fetching user notification preferences:', error)
    return {}
  }

  const byUser: Record<string, UserNotificationPreferenceRow[]> = {}
  for (const row of (data ?? []) as UserNotificationPreferenceRow[]) {
    if (!byUser[row.user_id]) byUser[row.user_id] = []
    byUser[row.user_id].push(row)
  }

  const result: Record<string, EffectivePreferences> = {}
  for (const [userId, rows] of Object.entries(byUser)) {
    result[userId] = buildPreferencesMap(rows)
  }
  return result
}

/* Lightweight email adapter: sends via external provider when configured, logs otherwise */
async function sendEmail(params: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<void> {
  const apiUrl = Deno.env.get('NOTIFICATIONS_EMAIL_API_URL')
  const apiKey = Deno.env.get('NOTIFICATIONS_EMAIL_API_KEY')

  if (!apiUrl || !apiKey) {
    console.log('Email notification (log-only, provider not configured):', params)
    return
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('Email provider error:', res.status, body)
    throw new Error(`Email provider error: ${res.status}`)
  }
}

/* Push adapter: delegates to external web push API / worker, or logs when not configured */
async function sendPush(params: {
  userId: string
  title: string
  body: string
  data?: Record<string, unknown>
  channels: NotificationChannel[]
}): Promise<void> {
  const apiUrl = Deno.env.get('NOTIFICATIONS_PUSH_API_URL')
  const apiKey = Deno.env.get('NOTIFICATIONS_PUSH_API_KEY')

  if (!apiUrl || !apiKey) {
    console.log('Push notification (log-only, provider not configured):', params)
    return
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('Push provider error:', res.status, body)
    throw new Error(`Push provider error: ${res.status}`)
  }
}

/* Fetch a map of user id -> email address from auth.users */
async function loadUserEmails(
  supabase: ReturnType<typeof getServiceClient>,
  userIds: string[],
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {}
  const { data, error } = await supabase
    .schema('auth')
    .from('users')
    .select('id, email')
    .in('id', userIds)

  if (error) {
    console.error('Error fetching user emails:', error)
    return {}
  }

  const map: Record<string, string> = {}
  for (const row of (data ?? []) as { id: string; email: string | null }[]) {
    if (row.email) {
      map[row.id] = row.email
    }
  }
  return map
}

/* Determine whether a notification for a specific logical event has already been sent */
async function hasExistingNotification(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  type: NotificationType,
  channel: NotificationChannel,
  sourceType: string,
  sourceId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('channel', channel)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .in('status', ['pending', 'sent'])
    .limit(1)

  if (error) {
    console.error('Error checking existing notification:', error)
    return false
  }

  return (data ?? []).length > 0
}

/* Record a notification attempt/result in the notifications table */
async function recordNotification(params: {
  supabase: ReturnType<typeof getServiceClient>
  userId: string
  type: NotificationType
  channel: NotificationChannel
  sourceType: string
  sourceId: string
  payload: Record<string, unknown>
  status: 'pending' | 'sent' | 'error' | 'skipped'
  errorMessage?: string
}): Promise<void> {
  const { supabase, userId, type, channel, sourceType, sourceId, payload, status, errorMessage } =
    params
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    channel,
    source_type: sourceType,
    source_id: sourceId,
    payload,
    status,
    error: errorMessage ?? null,
    scheduled_for: new Date().toISOString(),
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  })

  if (error) {
    console.error('Error recording notification:', error)
  }
}

/* Main handler: scan for due/overdue items and send notifications based on user preferences */
serve(async (req) => {
  const supabase = getServiceClient()
  const now = new Date()

  try {
    const url = new URL(req.url)
    const debug = url.searchParams.get('debug') === 'true'

    const { data: taskRows, error: taskError } = await supabase
      .from('tasks')
      .select('id, user_id, title, due_date, status')
      .in('status', ['active', 'in_progress'])
      .lt('due_date', now.toISOString())

    if (taskError) {
      console.error('Error querying overdue tasks:', taskError)
    }

    const { data: reminderRows, error: reminderError } = await supabase
      .from('reminders')
      .select('id, user_id, name, remind_at, completed, deleted')
      .lte('remind_at', now.toISOString())
      .eq('completed', false)
      .eq('deleted', false)

    if (reminderError) {
      console.error('Error querying due reminders:', reminderError)
    }

    const { data: habitRows, error: habitError } = await supabase
      .from('habits')
      .select('id, user_id, name, reminder_id')
      .not('reminder_id', 'is', null)

    if (habitError) {
      console.error('Error querying habits with reminders:', habitError)
    }

    const habitReminderIds = ((habitRows ?? []) as { reminder_id: string | null }[])
      .map((h) => h.reminder_id)
      .filter((id): id is string => !!id)

    let habitReminderRows: any[] = []
    if (habitReminderIds.length > 0) {
      const { data: hr, error: hrError } = await supabase
        .from('reminders')
        .select('id, user_id, name, remind_at, completed, deleted')
        .in('id', habitReminderIds)
        .lte('remind_at', now.toISOString())
        .eq('completed', false)
        .eq('deleted', false)
      if (hrError) {
        console.error('Error querying habit reminders:', hrError)
      } else {
        habitReminderRows = hr ?? []
      }
    }

    const allUserIds = new Set<string>()
    for (const t of taskRows ?? []) allUserIds.add((t as any).user_id)
    for (const r of reminderRows ?? []) allUserIds.add((r as any).user_id)
    for (const h of habitRows ?? []) allUserIds.add((h as any).user_id)

    const userIdList = Array.from(allUserIds)
    const prefsByUser = await loadPreferencesByUserIds(supabase, userIdList)

    for (const task of (taskRows ?? []) as {
      id: string
      user_id: string
      title: string
      due_date: string | null
      status: string
    }[]) {
      const userId = task.user_id
      const prefs = prefsByUser[userId] ?? {}
      const basePayload = {
        kind: 'task',
        task_id: task.id,
        title: task.title,
        due_date: task.due_date,
      }

      for (const channel of ['push_mobile'] as NotificationChannel[]) {
        if (!isEnabled(prefs, 'task_overdue', channel)) continue
        const already = await hasExistingNotification(
          supabase,
          userId,
          'task_overdue',
          channel,
          'task',
          task.id,
        )
        if (already) continue

        try {
          await sendPush({
            userId,
            title: 'Task overdue',
            body: task.title,
            data: basePayload,
            channels: [channel],
          })
          await recordNotification({
            supabase,
            userId,
            type: 'task_overdue',
            channel,
            sourceType: 'task',
            sourceId: task.id,
            payload: basePayload,
            status: 'sent',
          })
        } catch (err) {
          console.error('Error sending overdue task push:', err)
          await recordNotification({
            supabase,
            userId,
            type: 'task_overdue',
            channel,
            sourceType: 'task',
            sourceId: task.id,
            payload: basePayload,
            status: 'error',
            errorMessage: (err as Error).message,
          })
        }
      }
    }

    for (const reminder of (reminderRows ?? []) as {
      id: string
      user_id: string
      name: string
      remind_at: string | null
    }[]) {
      const userId = reminder.user_id
      const prefs = prefsByUser[userId] ?? {}
      const basePayload = {
        kind: 'reminder',
        reminder_id: reminder.id,
        name: reminder.name,
        remind_at: reminder.remind_at,
      }

      for (const channel of ['push_mobile'] as NotificationChannel[]) {
        if (!isEnabled(prefs, 'reminder_due', channel)) continue
        const already = await hasExistingNotification(
          supabase,
          userId,
          'reminder_due',
          channel,
          'reminder',
          reminder.id,
        )
        if (already) continue

        try {
          await sendPush({
            userId,
            title: 'Reminder due',
            body: reminder.name,
            data: basePayload,
            channels: [channel],
          })
          await recordNotification({
            supabase,
            userId,
            type: 'reminder_due',
            channel,
            sourceType: 'reminder',
            sourceId: reminder.id,
            payload: basePayload,
            status: 'sent',
          })
        } catch (err) {
          console.error('Error sending reminder push:', err)
          await recordNotification({
            supabase,
            userId,
            type: 'reminder_due',
            channel,
            sourceType: 'reminder',
            sourceId: reminder.id,
            payload: basePayload,
            status: 'error',
            errorMessage: (err as Error).message,
          })
        }
      }
    }

    for (const reminder of habitReminderRows as {
      id: string
      user_id: string
      name: string
      remind_at: string | null
    }[]) {
      const userId = reminder.user_id
      const prefs = prefsByUser[userId] ?? {}
      const basePayload = {
        kind: 'habit_reminder',
        reminder_id: reminder.id,
        name: reminder.name,
        remind_at: reminder.remind_at,
      }

      for (const channel of ['push_mobile'] as NotificationChannel[]) {
        if (!isEnabled(prefs, 'habit_reminder_due', channel)) continue
        const already = await hasExistingNotification(
          supabase,
          userId,
          'habit_reminder_due',
          channel,
          'habit_reminder',
          reminder.id,
        )
        if (already) continue

        try {
          await sendPush({
            userId,
            title: 'Habit reminder',
            body: reminder.name,
            data: basePayload,
            channels: [channel],
          })
          await recordNotification({
            supabase,
            userId,
            type: 'habit_reminder_due',
            channel,
            sourceType: 'habit_reminder',
            sourceId: reminder.id,
            payload: basePayload,
            status: 'sent',
          })
        } catch (err) {
          console.error('Error sending habit reminder push:', err)
          await recordNotification({
            supabase,
            userId,
            type: 'habit_reminder_due',
            channel,
            sourceType: 'habit_reminder',
            sourceId: reminder.id,
            payload: basePayload,
            status: 'error',
            errorMessage: (err as Error).message,
          })
        }
      }
    }

    if (debug) {
      return new Response(
        JSON.stringify({
          now: now.toISOString(),
          overdueTasks: (taskRows ?? []).length,
          dueReminders: (reminderRows ?? []).length,
          dueHabitReminders: habitReminderRows.length,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response('Notifications processed', { status: 200 })
  } catch (err) {
    console.error('Unhandled error in notifications function:', err)
    return new Response('Internal error', { status: 500 })
  }
})

