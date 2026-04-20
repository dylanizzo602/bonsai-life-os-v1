/* Notifications edge function: scan overdue tasks and due habit todo reminders; send mobile push notifications */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DateTime } from 'https://esm.sh/luxon@3.5.0'

type NotificationType =
  | 'task_overdue'
  | 'task_due_soon'
  | 'reminder_due'
  | 'habit_reminder_due'
  | 'morning_briefing_incomplete_noon'
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
  /* Supabase Edge Functions restrict setting secrets prefixed with SUPABASE_. Use NOTIFICATIONS_* for CLI-friendly config. */
  const url = Deno.env.get('NOTIFICATIONS_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? ''
  const key =
    Deno.env.get('NOTIFICATIONS_SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    ''
  return createClient(url, key, { auth: { persistSession: false } })
}

/* Determine non-midnight time in an ISO string (00:00 treated as date-only / placeholder) */
function hasExplicitTimeInString(isoString: string): boolean {
  const m = isoString.match(/T(\d{2}):(\d{2})/)
  return Boolean(m && (m[1] !== '00' || m[2] !== '00'))
}

/* Best-effort read of a user's preferred IANA timezone from auth user_metadata */
function getUserTimeZone(userRow: { user_metadata?: Record<string, unknown> } | null): string {
  const tz = userRow?.user_metadata && typeof userRow.user_metadata.time_zone === 'string'
    ? String(userRow.user_metadata.time_zone)
    : ''
  return tz.trim() || 'local'
}

/* Explicit timezone guard: server-side noon notifications should only run when a real IANA zone is saved. */
function hasExplicitUserTimeZone(userRow: { user_metadata?: Record<string, unknown> } | null): boolean {
  return getUserTimeZone(userRow) !== 'local'
}

/* Normalize fallback zone so comparisons stay deterministic in the edge runtime.
 * Note: 'local' is not a real IANA zone in Edge Functions; treating it as UTC can shift
 * user-intended local-noon and day-boundary rules. We only use UTC fallback for
 * non-user-specific computations; user-specific rules should require an explicit IANA zone. */
function getEffectiveTimeZone(timeZone: string): string {
  return timeZone === 'local' ? 'UTC' : timeZone
}

/* Parse a stored task ISO into the user's zone while preserving date-only semantics. */
function toZonedDateTime(
  isoString: string | null | undefined,
  timeZone: string,
): DateTime | null {
  if (isoString == null || isoString === '') return null
  const zone = getEffectiveTimeZone(timeZone)
  if (!isoString.includes('T')) {
    const dt = DateTime.fromISO(isoString, { zone })
    return dt.isValid ? dt : null
  }
  if (!hasExplicitTimeInString(isoString)) {
    const datePart = isoString.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const dt = DateTime.fromISO(datePart, { zone })
      return dt.isValid ? dt : null
    }
  }
  const parsed = DateTime.fromISO(isoString, { setZone: true })
  if (!parsed.isValid) return null
  return parsed.setZone(zone)
}

/* Shared due classification: match app semantics so date-only tasks flip overdue after local end-of-day. */
function getTaskDueStatusForNotifications(
  dueDate: string | null | undefined,
  timeZone: string,
): 'none' | 'dueSoon' | 'overdue' {
  if (!dueDate) return 'none'
  const due = toZonedDateTime(dueDate, timeZone)
  if (!due) return 'none'

  const hasT = dueDate.includes('T')
  const explicit = hasExplicitTimeInString(dueDate)

  /* Timed tasks: overdue after the instant; due-soon only in the last hour before it. */
  if (hasT && explicit) {
    const instant = DateTime.fromISO(dueDate, { setZone: true })
    if (!instant.isValid) return 'none'
    const dueMs = instant.toMillis()
    const nowMs = Date.now()
    if (dueMs < nowMs) return 'overdue'
    const untilDue = dueMs - nowMs
    if (untilDue <= 60 * 60 * 1000) return 'dueSoon'
    return 'none'
  }

  /* Date-only and midnight-placeholder dues: compare by the user's local calendar day. */
  const now = DateTime.now().setZone(getEffectiveTimeZone(timeZone))
  const todayStart = now.startOf('day')
  const dueDayStart = due.startOf('day')

  const todayKey = todayStart.year * 10000 + todayStart.month * 100 + todayStart.day
  const dueKey = dueDayStart.year * 10000 + dueDayStart.month * 100 + dueDayStart.day

  if (dueKey < todayKey) return 'overdue'
  return 'none'
}

/* Morning briefing noon gate: only allow sending in a short window after 12pm in the user's zone. */
function isWithinMorningBriefingNoonWindow(timeZone: string): boolean {
  const zone = getEffectiveTimeZone(timeZone)
  const nowZ = DateTime.now().setZone(zone)
  const noonZ = nowZ.set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
  const elapsedMs = nowZ.toMillis() - noonZ.toMillis()
  const NOON_WINDOW_MS = 60 * 1000
  return elapsedMs >= 0 && elapsedMs <= NOON_WINDOW_MS
}

/* Stable local day key: use the user's effective zone so dedupe/source ids do not drift via UTC conversion. */
function getLocalDayKey(timeZone: string, instant?: DateTime): string {
  const zone = getEffectiveTimeZone(timeZone)
  const base = instant ? instant.setZone(zone) : DateTime.now().setZone(zone)
  return base.toFormat('yyyy-LL-dd')
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

/* Fetch a map of user id -> auth user row (for timezone metadata, email, etc.) */
async function loadAuthUsersByIds(
  supabase: ReturnType<typeof getServiceClient>,
  userIds: string[],
): Promise<Record<string, { id: string; email: string | null; user_metadata: Record<string, unknown> }>> {
  if (userIds.length === 0) return {}
  const { data, error } = await supabase
    .schema('auth')
    .from('users')
    .select('id, email, user_metadata')
    .in('id', userIds)

  if (error) {
    console.error('Error fetching auth users:', error)
    return {}
  }

  const map: Record<string, { id: string; email: string | null; user_metadata: Record<string, unknown> }> = {}
  for (const row of (data ?? []) as any[]) {
    if (row?.id) map[String(row.id)] = row
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

/* Determine whether a notification has already been sent using a string dedupe key.
 * This supports non-UUID logical ids (e.g. per-day keys like YYYY-MM-DD). */
async function hasExistingNotificationByDedupeKey(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  type: NotificationType,
  channel: NotificationChannel,
  dedupeKey: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('channel', channel)
    .eq('dedupe_key', dedupeKey)
    .in('status', ['pending', 'sent'])
    .limit(1)

  if (error) {
    console.error('Error checking existing notification by dedupe key:', error)
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
  sourceId?: string | null
  payload: Record<string, unknown>
  dedupeKey?: string
  status: 'pending' | 'sent' | 'error' | 'skipped'
  errorMessage?: string
}): Promise<void> {
  const { supabase, userId, type, channel, sourceType, payload, status, errorMessage } = params
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    channel,
    source_type: sourceType,
    ...(params.sourceId ? { source_id: params.sourceId } : {}),
    dedupe_key: params.dedupeKey ?? null,
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

    /* Task candidate query: load active non-habit tasks with due dates, then classify per-user in JS. */
    const { data: taskCandidates, error: taskError } = await supabase
      .from('tasks')
      .select('id, user_id, title, due_date, status')
      .in('status', ['active', 'in_progress'])
      .is('habit_id', null)
      .not('due_date', 'is', null)

    if (taskError) {
      console.error('Error querying task notification candidates:', taskError)
    }

    const { data: habitTaskRows, error: habitTaskError } = await supabase
      .from('tasks')
      .select('id, user_id, title, due_date, habit_id')
      .in('status', ['active', 'in_progress'])
      .not('habit_id', 'is', null)
      .lte('due_date', now.toISOString())

    if (habitTaskError) {
      console.error('Error querying habit-linked tasks for reminders:', habitTaskError)
    }

    const allUserIds = new Set<string>()
    for (const t of taskCandidates ?? []) allUserIds.add((t as any).user_id)
    for (const h of habitTaskRows ?? []) allUserIds.add((h as any).user_id)

    const userIdList = Array.from(allUserIds)
    const prefsByUser = await loadPreferencesByUserIds(supabase, userIdList)
    const authUsersById = await loadAuthUsersByIds(supabase, userIdList)
    const overdueTaskRows: {
      id: string
      user_id: string
      title: string
      due_date: string | null
      status: string
    }[] = []
    const dueSoonTaskRows: {
      id: string
      user_id: string
      title: string
      due_date: string | null
      status: string
    }[] = []

    /* Task bucketing: apply the same timezone-aware due semantics used in the app before notifying. */
    for (const task of (taskCandidates ?? []) as {
      id: string
      user_id: string
      title: string
      due_date: string | null
      status: string
    }[]) {
      const userTimeZone = getUserTimeZone(authUsersById[task.user_id] ?? null)
      const dueStatus = getTaskDueStatusForNotifications(task.due_date, userTimeZone)
      if (dueStatus === 'overdue') {
        overdueTaskRows.push(task)
        continue
      }
      if (
        dueStatus === 'dueSoon' &&
        task.due_date &&
        task.due_date.includes('T') &&
        hasExplicitTimeInString(task.due_date)
      ) {
        dueSoonTaskRows.push(task)
      }
    }

    /* Morning briefing noon check: compute user-local noon and query reflection_entries in the user's local day window */
    for (const userId of userIdList) {
      const prefs = prefsByUser[userId] ?? {}
      if (!isEnabled(prefs, 'morning_briefing_incomplete_noon', 'push_mobile')) continue

      const authUser = authUsersById[userId] ?? null
      const tz = getUserTimeZone(authUser)
      /* Timezone requirement: morning briefing noon must be computed in a real IANA zone.
       * If we don't have one saved, skip rather than incorrectly firing at UTC noon. */
      if (!hasExplicitUserTimeZone(authUser)) continue
      const zone = getEffectiveTimeZone(tz)
      const nowZ = DateTime.now().setZone(zone)
      const noonZ = nowZ.set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
      const briefingDayKey = getLocalDayKey(tz, noonZ)
      if (!isWithinMorningBriefingNoonWindow(tz)) continue

      const dayStartUtc = noonZ.startOf('day').toUTC().toISO()!
      const dayEndUtc = noonZ.endOf('day').plus({ millisecond: 1 }).toUTC().toISO()!

      const { data: briefings, error: briefingErr } = await supabase
        .from('reflection_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'morning_briefing')
        .gte('created_at', dayStartUtc)
        .lt('created_at', dayEndUtc)
        .limit(1)

      if (briefingErr) {
        console.error('Error checking morning briefing entries:', briefingErr)
        continue
      }

      const hasCompleted = (briefings ?? []).length > 0
      if (hasCompleted) continue

      /* Dedupe: notifications.source_id is UUID; use dedupe_key for per-day string keys. */
      const dedupeKey = `morning_briefing_incomplete_noon:${briefingDayKey}`
      const already = await hasExistingNotificationByDedupeKey(
        supabase,
        userId,
        'morning_briefing_incomplete_noon',
        'push_mobile',
        dedupeKey,
      )
      if (already) continue

      try {
        await sendPush({
          userId,
          title: 'Morning briefing',
          body: 'Your morning briefing is still incomplete.',
          data: { kind: 'morning_briefing', date: briefingDayKey },
          channels: ['push_mobile'],
        })
        await recordNotification({
          supabase,
          userId,
          type: 'morning_briefing_incomplete_noon',
          channel: 'push_mobile',
          sourceType: 'morning_briefing',
          sourceId: null,
          dedupeKey,
          payload: { kind: 'morning_briefing', date: briefingDayKey },
          status: 'sent',
        })
      } catch (err) {
        console.error('Error sending morning briefing push:', err)
        await recordNotification({
          supabase,
          userId,
          type: 'morning_briefing_incomplete_noon',
          channel: 'push_mobile',
          sourceType: 'morning_briefing',
          sourceId: null,
          dedupeKey,
          payload: { kind: 'morning_briefing', date: briefingDayKey },
          status: 'error',
          errorMessage: (err as Error).message,
        })
      }
    }

    /* Due-soon tasks: send a "due in 1 hour" notification for tasks with explicit times */
    for (const task of (dueSoonTaskRows ?? []) as {
      id: string
      user_id: string
      title: string
      due_date: string | null
      status: string
    }[]) {
      if (!task.due_date || !task.due_date.includes('T') || !hasExplicitTimeInString(task.due_date)) continue
      const userId = task.user_id
      const prefs = prefsByUser[userId] ?? {}
      const basePayload = {
        kind: 'task',
        task_id: task.id,
        title: task.title,
        due_date: task.due_date,
      }

      for (const channel of ['push_mobile'] as NotificationChannel[]) {
        if (!isEnabled(prefs, 'task_due_soon', channel)) continue
        const already = await hasExistingNotification(
          supabase,
          userId,
          'task_due_soon',
          channel,
          'task',
          task.id,
        )
        if (already) continue

        try {
          await sendPush({
            userId,
            title: 'Task due soon',
            body: `${task.title}`,
            data: basePayload,
            channels: [channel],
          })
          await recordNotification({
            supabase,
            userId,
            type: 'task_due_soon',
            channel,
            sourceType: 'task',
            sourceId: task.id,
            payload: basePayload,
            status: 'sent',
          })
        } catch (err) {
          console.error('Error sending due-soon task push:', err)
          await recordNotification({
            supabase,
            userId,
            type: 'task_due_soon',
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

    for (const task of overdueTaskRows) {
      id: string
      user_id: string
      title: string
      due_date: string | null
      status: string
    }) {
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

    for (const row of (habitTaskRows ?? []) as {
      id: string
      user_id: string
      title: string
      due_date: string | null
      habit_id: string
    }[]) {
      const userId = row.user_id
      const prefs = prefsByUser[userId] ?? {}
      const basePayload = {
        kind: 'habit_reminder',
        habit_id: row.habit_id,
        task_id: row.id,
        name: row.title,
        remind_at: row.due_date,
      }

      for (const channel of ['push_mobile'] as NotificationChannel[]) {
        if (!isEnabled(prefs, 'habit_reminder_due', channel)) continue
        const already = await hasExistingNotification(
          supabase,
          userId,
          'habit_reminder_due',
          channel,
          'habit',
          row.habit_id,
        )
        if (already) continue

        try {
          await sendPush({
            userId,
            title: 'Habit reminder',
            body: row.title,
            data: basePayload,
            channels: [channel],
          })
          await recordNotification({
            supabase,
            userId,
            type: 'habit_reminder_due',
            channel,
            sourceType: 'habit',
            sourceId: row.habit_id,
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
            sourceType: 'habit',
            sourceId: row.habit_id,
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
          overdueTasks: overdueTaskRows.length,
          dueSoonTasks: dueSoonTaskRows.length,
          dueHabitTodoReminders: (habitTaskRows ?? []).length,
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

